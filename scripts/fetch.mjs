/* ============================================================
   FPL GAGNASÖFNUN — scripts/fetch.mjs
   Node 20, global fetch, ENGAR dependencies.
   Keyrt af .github/workflows/fetch.yml (cron 1x/dag).
   Hver heimild í sínu try/catch; AÐEINS FPL-brestur fellir keyrsluna.
   Skrifar data/*.json inn í repo-ið; framendi les þær sömu-origin
   (eða frá raw.githubusercontent).

   ÓSTAÐFEST (þarf logg úr fyrstu keyrslu — sjá console + status.json):
   - merking defensive_contribution (aðgerðir vs þröskulds-leikir)
   - kolónuheiti á api.clubelo.com/Fixtures
   - breytuheiti á Understat-síðum
   - nafnastafsetning nýliða hjá ClubElo
   ============================================================ */

import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
/* Markaðs-umbreytingin (odds -> vænt mörk -> FFDR-þyngd) er FLUTT í
   src/market.js svo bakprófið keyri nakvaemlega sama kóða og pipeline.
   Hún var áður staðbundin hér og þar með óprófanleg — samt með vog 0,50
   í FFDR fyrir GK/DEF. Sjá tests/ffdr-walkforward.mjs.                  */
import { poissonCleanSheet, marketDiff, marketGoals, devig, devig2 } from "../src/market.js";
import { collectPros } from "./pros-collect.mjs";
import { IN_BOX, shotZone } from "./espn-zones.mjs";
import { mergeLineupSnapshot, newAcc, addPlayerRow, addShot, resolveTeam,
         finalize, pairPlayers, BSD_TEAM } from "../src/bsd.js";
/* EIN UTFAERSLA A BYRJUNAR-EIGINLEIKUNUM. Pipeline hafdi EIGIN afrit af
   thessum reikningi og thad var ThEGAR farid ad reka: afritid skrifadi
   `value: r.now_cost ?? null` medan `startFeatures` fellur a MEDALTALID
   (48,69). `startProbability` skilar null um leid og EINN lidur er null —
   svo leikmadur an verds hefdi thagnad um byrjunar-likur i stad thess ad
   fa varfaerid mat. Enginn slikur i gognunum i dag (0 af 840), en tvaer
   utfaerslur af somu formulu er nakvaemlega thad sem hausarnir banna.  */
import { startFeatures, nameScore } from "../src/stats.js";
/* EIN NAFNA-NORMUN. `apiNameIndex` bar sinn EIGIN normolara an TRANSLIT-
   toflunnar til 21.8.2026, svo "Nørgaard" vard "n rgaard" og meidsla-porunin
   missti hann — nakvaemlega tvitekningin sem src/names.js var stofnud um.
   Vordur: tests/name-norm.mjs kafli 1b.                                  */
import { normName } from "../src/names.js";

const UA = "Mozilla/5.0 (compatible; FPL-data-collector/1.0; +github-actions)";
const DATA = "data";
const today = new Date().toISOString().slice(0, 10);

const FLAGS = {
  apisports: !!process.env.API_SPORTS_KEY,
  elo:             (process.env.ENABLE_ELO ?? "true")        === "true",
  fdcouk:          (process.env.ENABLE_FDCOUK ?? "true")     === "true",
  weather:         (process.env.ENABLE_WEATHER ?? "true")    === "true",
  /* `espn` VAR HER OG VAR ALDREI LESIN (fjarlaegd 14.8.2026).
     Flaggid var skilgreint med sjalfgildi "false" OG `fetch.yml` setti
     `ENABLE_ESPN: "false"` — en `fetchEspnShots()` er kollud undir
     `FLAGS.derived`, svo ESPN var sótt i HVERRI keyrslu hvad sem flagginu
     leid (`status.json`: espn_shots ok:true, 290 skot). Uppsetningin sagdi
     thvi hid gagnstaeda vid thad sem gerdist, i baðum attum.
     ESPN ER EINA LIFANDI SKOT-HEIMILDIN (CLAUDE.md 6) og vid VILJUM hana, svo
     retta lagfaeringin er ad fjarlaegja logina — ekki ad vira hana og hætta a
     ad slokkva a virkri heimild vid naesta workflow-misritun. Vantar
     `ENABLE_*` er nu MAELT i `workflow-push.mjs` svo dautt flagg finnist.  */
  euro:            (process.env.ENABLE_EURO ?? "true")       === "true",
  travel:          (process.env.ENABLE_TRAVEL ?? "true")     === "true",
  derived:         (process.env.ENABLE_DERIVED ?? "true")    === "true",
  odds_key:        process.env.ODDS_API_KEY || "",
  /* BSD (sports.bzzoiro.com) — okeypis, enginn kvoti. Maelt 8.8.2026:
     ~1.400 koll i einni lotu an throttlunar. Sja CLAUDE.md 6t.        */
  bsd:             !!process.env.BSD_KEY,
};

const status = { updated: new Date().toISOString(), sources: {} };
function record(name, ok, count, note) {
  status.sources[name] = { ok, count: count ?? null, note: note ?? null };
  console.log(`[${ok ? "OK " : "ERR"}] ${name} — ${count ?? "?"} ${note ? "· " + note : ""}`);
}

async function writeJSON(path, obj) {
  const full = `${DATA}/${path}`;
  await mkdir(full.split("/").slice(0, -1).join("/"), { recursive: true });
  await writeFile(full, JSON.stringify(obj));
}
/* TIMAMORK A OLL UTANHUSS-KOLL. VANTADI a 8 af 10 — thar med a THESSUM
   sameiginlega hjalpara, sem FPL, ESPN, GitHub-raw og football-data.co.uk
   fara OLL gegnum. undici hefur ~300 s sjalfgildi, sem er ekki timamork i
   cron heldur HENGJA: ein daud tenging gat lokad keyrslunni i 5 minutur og
   thagad nidur allt sem kom a eftir. ClubElo og API-Sports fengu mörk 31.7.
   og 2.8. — thetta alhaefir thad i stad thess ad laga eitt og eitt.       */
const FETCH_TIMEOUT_MS = 20000;
/* `fetch` MED timamorkum. Fyrir tha stadi sem lesa `r.headers` eda `r.ok`
   sjalfir og geta thvi ekki farid gegnum getText/getJSON.                 */
const fetchT = (url, opts = {}) =>
  fetch(url, { ...opts, signal: AbortSignal.timeout(opts.timeoutMs || FETCH_TIMEOUT_MS) });
/* ENDURTILRAUNIR (11.8.2026). `getText` gerdi EINA tilraun, og
   `bootstrap-static` — sem ALLT annad haengir a — fer gegnum hana. Eitt
   hikst hja FPL kl. 05:00 UTC felldi thvi ALLA dagkeyrsluna og hvert svid
   i `data/` vard 24 klst gamalt. ClubElo-sokninn hafdi fjorar tilraunir;
   kjarninn hafdi enga.

   ADEINS ThAD SEM ER ThESS VERT: 429 og 5xx eru timabundin og eru
   endurteknar. 404 er SVAR, ekki bilun — `fdcouk_e0` fyrir 2026/27 er 404
   thangad til fyrsti leikur er buinn, og ad endurtaka thad thrisvar vaeri
   bara haegara. Sama rok og i BSD-skriftunum.                            */
async function getText(url, opts = {}) {
  const tries = opts.tries ?? 3;
  let last = null;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA, ...(opts.headers || {}) },
                                   signal: AbortSignal.timeout(opts.timeoutMs || FETCH_TIMEOUT_MS) });
      if (r.ok) return { text: await r.text(), res: r };
      if (r.status === 429 || r.status >= 500) { last = new Error(`${r.status} ${url}`); }
      else throw new Error(`${r.status} ${url}`);        // 404 o.fl.: svar, ekki bilun
    } catch (e) {
      if (e?.message && /^\d{3} /.test(e.message) && !/^(429|5\d\d) /.test(e.message)) throw e;
      last = e;
    }
    if (i < tries - 1) await new Promise(r => setTimeout(r, 800 * (i + 1)));
  }
  throw last || new Error(`gave up after ${tries} attempts: ${url}`);
}
async function getJSON(url, opts = {}) {
  const { text } = await getText(url, opts);
  return JSON.parse(text);
}
// einföld CSV -> fylki af hlutum (skilar líka hráu haus-línunni til að logga)
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(",");
  const rows = lines.slice(1).map(l => {
    const cells = l.split(",");
    const o = {}; header.forEach((h, i) => o[h] = cells[i]); return o;
  });
  return { header, rows };
}

/* ============================================================
   API-NAFNA-VISIR — EIN UTFAERSLA (11.8.2026)

   `norm`, `teamIdByNorm`, `fplByTeam` og `matchFpl` voru skilgreind
   ORDRETT TVISVAR: i `fetchLineups` og i `fetchInjuries`. Afritin voru
   virkni-eins (adeins linuskil og breytu-nofn skildu: `nm`/`apiName`,
   `c`/`cands`, `bl`/`byLast`), svo sameiningin breytir engri porun.

   ThAU MATTU ALDREI REKA, OG ThAD ER EKKI SMEKKUR: bædi hlidin para
   API-Sports-nofn vid FPL-id, og porunin er SKORDUD VID LID einmitt til ad
   algeng eftirnofn skorist ekki. Vaeri eftirnafns-reglan hert a odrum
   staðnum og ekki hinum fengju MEIDSLI og BYRJUNARLID sitthvora porun a
   sama leikmanninn — og hvorugt myndi kvarta.

   `matchFpl` skilar `null` fyrir oparad nafn, ALDREI 0: sja regluna um
   null-vs-0. Fyrsta lykla-mengid er viljandi fjorþaett (web_name, fullt
   nafn, eftirnafn, "F. Eftirnafn") thvi API-id skammstafar fornofn.

   >>> FJORAR VILLUR FUNDUST 21.8.2026, FYRSTA DAGINN SEM HEIMILDIN BAR
   >>> RAUNGOGN (GW1). `injuries.json`: 27 paradir, 10 oparadir = 73,0%, svo
   >>> `tests/wiring.mjs` fell — vordurinn vaknadi eins og hann atti ad gera.
   >>> En hann sagdi "heimild hefur breytt nafnaformi" og ThAD VAR EKKI
   >>> ORSOKIN i sjo af tiu tilfellum:

   1. LIDANAFNID PARADIST EKKI, EKKI LEIKMANNSNAFNID. API-Sports sendir
      "Manchester United" og "Nottingham Forest"; `teams_map` ber "Man Utd" /
      "Man United" / "ManUnited" og "Nott'm Forest" / "Forest". ENGIN
      tilbrigdi bera borgarnafnid, svo `teamIdByNorm` hitti EKKERT og ALLIR
      sjo Man Utd- og Forest-menn foru i `unmatched` thott their seu ALLIR i
      FPL (Darlow 325, Ugarte 433, De Ligt 416, Heaton 414, Mount 430,
      Savona 475, Yates 489). Sama gilti um "Manchester City" — hun slapp
      adeins vid ad koma fram af thvi ad MCI atti engin meidsli thennan dag.
      **OG I `fetchLineups` VAR AFLEIDINGIN VERRI OG ThOGUL:** thar er oleyst
      lid `continue` (bædi i `apiFx`-byggingunni og i lineups-lykkjunni), svo
      GW1-leikir Man Utd og Forest hefdu skilad ENGU byrjunarlidi og EKKERT
      hefdi talid thad — hvorki `unmatched` ne `errors`. Vordurinn thar
      ("oparadir undir 15%") getur ekki fallid a thvi sem er sleppt adur en
      thad verdur ad radi (CLAUDE.md 5b).
      LAGT: `API_TEAM_ALIAS` — HANDSTADFEST tafla, sama regla og `BSD_TEAM`
      (fuzzy porun felldi Man United inn i Man City), OG `teamIdOf` sem TELUR
      thad sem paradist ekki i stad thess ad sleppa thvi thegjandi.
   2. NORMOLARINN VAR ANNAR EN HINN. Thessi skra bar sinn EIGIN `norm` an
      TRANSLIT-toflunnar, svo "Nørgaard" vard "n rgaard" (NFD leysir EKKI upp
      `ø` — nakvaemlega gildran sem `src/names.js` var stofnud um) og
      "C. Norgaard" (Everton) paradist ekki vid fpl 21. Nu er `normName`
      FLUTT INN. Maelt a ollum 37 raunrodum: **ein porun breytist**
      (Nørgaard null -> 21) og engin onnur — bædi hlidin fara gegnum sama
      normolara, svo TRANSLIT styttist ut annars stadar.
   3. SAMSETT EFTIRNOFN FELLU MILLI SKIPS OG LANDS. "M. Joseph" (Leeds) a
      moti FPL `second_name: "Joseph Fernández-Regatillo"`: hvorki heil jafna
      ne EITT sidasta tak passar. ThREP 3 er ORDA-YFIRSKORUN (sama lausn og
      "Diego Gomez Amarilla" vs "Diego Gomez"), skordud vid fornafns-
      upphafsstaf og EINKVAEMNI. Maelt a 1.279 tilbunum nofnum i raunverulega
      API-snidinu ("F. Eftirnafn", "F. Fullt eftirnafn", web_name) yfir alla
      587 leikmenn: **94,3% -> 99,9% rett, NULL ny rangporun**.
   4. ThOGUL RANGPORUN I ThREPI 1: thad notadi `c.find(...)` — FYRSTUR VINNUR.
      Man Utd a TVO Fletcher (Jack `J.Fletcher` og Tyler `Fletcher`) og bert
      "Fletcher" hitti RANGAN mann af thvi ad eftirnafns-lykill annars
      mannsins kom fyrr i fylkinu. Nu er krafist EINKVAEMNI, og se hun ekki
      til vinnur sa sem a `web_name`-jofnuna (sertaekasta FPL-identitetid).
      Maelt: 1.278/1.279 -> **1.279/1.279, engin rangporun**. ThOGUL RONG
      PORUN ER VERRI EN ENGIN (CLAUDE.md 6t).
      ThREP 3 leysir auk thess Fletcher/Murphy-tvenndirnar RETT
      ("T. Fletcher" -> Tyler, "J. Fletcher" -> Jack) thvi upphafsstafurinn
      er SKILYRDI, ekki visbending.

   EINN ThESSARA FJOGURRA ER I LIDA-VISINUM OG ThRIR I `matchFpl`, svo BADAR
   leidir (meidsli OG byrjunarlid) fa thá i einu — sem er allur punkturinn
   med thessu sameiginlega falli.

   SA EINI SEM STENDUR EFTIR OPARADUR ER RETT OPARADUR: "B. Fredrick
   (Brentford)" er EKKI i FPL (allur 26-manna Brentford-hopurinn skodadur;
   naesta nafn i deildinni er Tyler Fredricson hja Man Utd, ANNAD lid — og
   lid-skordunin er thad sem kemur i veg fyrir ThA porun). Heimildin telur
   hopa vidari en FPL gerir, svo hlutfall undir 100% er RETT UTKOMA.
   ============================================================ */
async function apiNameIndex() {
  const tmap = JSON.parse(await readFile(`${DATA}/teams_map.json`, "utf8"));
  const teamsJs = JSON.parse(await readFile(`${DATA}/teams.json`, "utf8")).teams;
  const players = JSON.parse(await readFile(`${DATA}/players.json`, "utf8")).players;
  /* EIN NAFNA-NORMUN I ALLRI HIRSLUNNI — sja src/names.js og
     tests/name-norm.mjs. Adur stod her afrit AN TRANSLIT-toflunnar.   */
  const norm = normName;
  /* HANDSTADFEST LIDANAFNA-TAFLA FYRIR API-SPORTS (21.8.2026).
     Hun bur INNI i thessu falli VILJANDI: `tests/lineups.mjs` dregur
     `apiNameIndex` UT UR thessari skra og keyrir hana i einangrun, svo taflan
     verdur ad fylgja fallinu — profid a ad keyra ThA TOFLU sem pipeline
     notar, ekki afrit af henni.
     MAELT LIFANDI 21.8.2026 (`data/injuries.json`): "Manchester United" og
     "Nottingham Forest" komu fra heimildinni og paradist EKKI. Hin nofnin eru
     SAMA NAFNAFORM fra somu heimild fyrir hin lidin og eru ThVI OSTADFEST —
     thau geta ekki bakad rangporun (hvert visar a EITT lid og arekstrar eru
     TALDIR, sja `aliasCollisions`), og vordurinn i `tests/wiring.mjs` fellur
     um leid og lidanafn ur RAUNGOGNUM parast ekki, svo missritun her kemur
     fram i fyrstu keyrslu thar sem lidid birtist.
     LYKILLINN ER `short`: lid utan deildar i ar eru einfaldlega SLEPPT og
     radast rett af sjalfu ser thegar thau koma upp aftur.                */
  const API_TEAM_ALIAS = {
    MUN: ["Manchester United"],          // MAELT lifandi 21.8.2026
    NFO: ["Nottingham Forest"],          // MAELT lifandi 21.8.2026
    MCI: ["Manchester City"],
    NEW: ["Newcastle United"],
    TOT: ["Tottenham Hotspur"],
    WHU: ["West Ham United", "West Ham"],
    WOL: ["Wolverhampton Wanderers", "Wolves"],
    BHA: ["Brighton & Hove Albion", "Brighton"],
    LEE: ["Leeds United"],
    BOU: ["AFC Bournemouth"],
    LEI: ["Leicester City"],
    SOU: ["Southampton"],
    SHU: ["Sheffield Utd", "Sheffield United"],
  };
  /* API-lidanafn -> FPL team id (leit i ollum nafna-afbrigdum teams_map) */
  const teamIdByNorm = {};
  for (const [id, t] of Object.entries(tmap))
    for (const v of [t.fpl, t.fdcouk, t.clubelo, t.understat, t.short])
      if (v) teamIdByNorm[norm(v)] = +id;
  teamsJs.forEach(t => { teamIdByNorm[norm(t.name)] = t.id; });
  /* Samheitin ofan a — ALDREI yfir gildan lykil sem visar a ANNAD lid.
     Arekstur er TALINN, ekki thagad um: hann vaeri missritun i toflunni og
     nakvaemlega su thogla rangporun sem `BSD_TEAM` er handstadfest fyrir. */
  const idByShort = {};
  for (const [id, t] of Object.entries(tmap)) if (t.short) idByShort[t.short] = +id;
  const aliasCollisions = [];
  for (const [sh, names] of Object.entries(API_TEAM_ALIAS)) {
    const id = idByShort[sh];
    if (!id) continue;                     // lidid er ekki i deildinni i ar
    for (const nm of names) {
      const k = norm(nm), cur = teamIdByNorm[k];
      if (cur != null && cur !== id) { aliasCollisions.push(`"${nm}": ${cur} vs ${id}`); continue; }
      teamIdByNorm[k] = id;
    }
  }
  /* EIN LEID INN AD LIDA-UPPFLETTINGU, OG HUN TELUR ThAD SEM MISTEKST.
     Adur var `teamIdByNorm[norm(x)]` skrifad a fjorum stodum og tvo theirra
     `continue`-udu ThEGJANDI a null — sja atridi 1 i hausnum.            */
  const unresolvedTeams = new Set();
  const teamIdOf = nm => {
    const id = teamIdByNorm[norm(nm)];
    if (id == null && nm) unresolvedTeams.add(String(nm));
    return id ?? null;
  };
  const fplByTeam = {};
  for (const p of players) {
    const keys = new Set([norm(p.web_name), norm(`${p.first_name} ${p.second_name}`),
      norm(p.second_name), norm(`${(p.first_name || "")[0] || ""} ${p.second_name}`)]);
    (fplByTeam[p.team] ??= []).push({ id: p.id, keys,
      /* threp 1b og threp 3 lesa thessi thrju — reiknud EINU SINNI per mann */
      web: norm(p.web_name),
      toks: new Set([...norm(p.second_name).split(" "), ...norm(p.web_name).split(" ")]
        .filter(t => t.length >= 2)),
      initial: norm(p.first_name)[0] || "" });
  }
  const matchFpl = (nm, teamId) => {
    const n = norm(nm), toks = n.split(" ").filter(Boolean);
    const last = toks[toks.length - 1] ?? "";
    const c = fplByTeam[teamId] || [];
    /* ThREP 1 — heil jafna a einhverjum af fjorum lyklum. EINKVAEMNI KRAFIST;
       vid jofnu vinnur sa sem a `web_name`-jofnuna (sja atridi 4).        */
    let hit;
    const exact = c.filter(x => x.keys.has(n));
    if (exact.length === 1) hit = exact[0];
    else if (exact.length > 1) {
      const w = exact.filter(x => x.web === n);
      if (w.length === 1) hit = w[0];
    }
    /* ThREP 2 — eitt sidasta tak, adeins se thad EINKVAEMT innan lidsins. */
    if (!hit) { const bl = c.filter(x => x.keys.has(last)); if (bl.length === 1) hit = bl[0]; }
    /* ThREP 3 — ORDA-YFIRSKORUN fyrir samsett eftirnofn ("M. Joseph" a moti
       "Joseph Fernández-Regatillo"). HVERT tak API-nafnsins verdur ad finnast
       i nafna-tokum leikmannsins, fornafns-upphafsstafur verdur ad passa se
       hann gefinn, og svarid verdur ad vera EINKVAEMT. Ekkert her er fuzzy:
       enginn throskuldur, engin fjarlaegd — adeins mengja-innihald.       */
    if (!hit) {
      const initial = toks.length > 1 && toks[0].length === 1 ? toks[0] : null;
      const sur = (initial ? toks.slice(1) : toks).filter(t => t.length >= 2);
      if (sur.length) {
        const cand = c.filter(x => sur.every(t => x.toks.has(t))
                                && (!initial || x.initial === initial));
        if (cand.length === 1) hit = cand[0];
      }
    }
    return hit?.id ?? null;
  };
  return { norm, teamIdByNorm, teamIdOf, unresolvedTeams, aliasCollisions,
           fplByTeam, matchFpl, players, teamsJs, tmap };
}

/* ---- Leikvangahnit, lyklað á FPL short_name (aðeins notuð fyrir lið í bootstrap) ---- */
const COORDS = {
  ARS:[51.5549,-0.1084], AVL:[52.5092,-1.8848], BOU:[50.7348,-1.8391], BRE:[51.4907,-0.2889],
  BHA:[50.8616,-0.0837], BUR:[53.7890,-2.2300], CHE:[51.4817,-0.1910], COV:[52.4480,-1.4956],
  CRY:[51.3983,-0.0855], EVE:[53.4180,-3.0080], FUL:[51.4749,-0.2217], HUL:[53.7460,-0.3676],
  IPS:[52.0553,1.1450],  LEE:[53.7778,-1.5722], LIV:[53.4308,-2.9608], MCI:[53.4831,-2.2004],
  MUN:[53.4631,-2.2913], NEW:[54.9756,-1.6217], NFO:[52.9400,-1.1327], SUN:[54.9145,-1.3882],
  TOT:[51.6043,-0.0665], WHU:[51.5387,-0.0166], WOL:[52.5903,-2.1303],
};
/* ---- Nafnavörpun eftir kerfi, lyklað á FPL short_name ---- */
const NAMES = {
  ARS:{clubelo:"Arsenal",fdcouk:"Arsenal"},
  AVL:{clubelo:"AstonVilla",fdcouk:"Aston Villa"},
  BOU:{clubelo:"Bournemouth",fdcouk:"Bournemouth"},
  BRE:{clubelo:"Brentford",fdcouk:"Brentford"},
  BHA:{clubelo:"Brighton",fdcouk:"Brighton"},
  BUR:{clubelo:"Burnley",fdcouk:"Burnley"},
  CHE:{clubelo:"Chelsea",fdcouk:"Chelsea"},
  COV:{clubelo:"Coventry",fdcouk:"Coventry"},
  CRY:{clubelo:"CrystalPalace",fdcouk:"Crystal Palace"},
  EVE:{clubelo:"Everton",fdcouk:"Everton"},
  FUL:{clubelo:"Fulham",fdcouk:"Fulham"},
  HUL:{clubelo:"Hull",fdcouk:"Hull"},
  IPS:{clubelo:"Ipswich",fdcouk:"Ipswich"},
  LEE:{clubelo:"Leeds",fdcouk:"Leeds"},
  LIV:{clubelo:"Liverpool",fdcouk:"Liverpool"},
  MCI:{clubelo:"ManCity",fdcouk:"Man City"},
  MUN:{clubelo:"ManUnited",fdcouk:"Man United"},
  NEW:{clubelo:"Newcastle",fdcouk:"Newcastle"},
  NFO:{clubelo:"Forest",fdcouk:"Nott'm Forest"},
  SUN:{clubelo:"Sunderland",fdcouk:"Sunderland"},
  TOT:{clubelo:"Tottenham",fdcouk:"Tottenham"},
  WHU:{clubelo:"WestHam",fdcouk:"West Ham"},
  WOL:{clubelo:"Wolves",fdcouk:"Wolves"},
};

/* ============================================================
   0b. AEFINGALEIKJA-BYRJANIR — data/preseason.json  (20.8.2026)

   HVERS VEGNA ThETTA ER TIL: 134 leikmenn i lifandi hopnum eiga ENGA
   start-window rod og 195 enga PL-minutu — hvert sumarkaup og hver
   leikmadur nyliðaklubbs. Fyrir tha skilar `startProbability` null og
   appid hefur EKKERT ad syna. Notandinn sa `st0%` a Tzolis og Sangare,
   sem er FJARVERA BIRT SEM MAELING.

   MAELT (`scripts/measure-preseason-starts.mjs`, 4 sumur, LOSO):
     · "byrjadi sidasta aefingaleik" er SAMThYKKT: d Brier +0,0341,
       95% CI [+0,0267, +0,0423]
     · fyrir hopinn AN sogu, thar sem VERD er allt sem er til:
       AUC 0,599 -> 0,831 a klubb-timabilum med thekju
     · hratt, sumarid 2025: "sest en 0 byrjanir" -> GW1-byrjun 0,000
       (n=118); 3-4 byrjanir -> 70,4% a moti grunni 21,8%
   MAELT OG FELLT, MA EKKI BYGGJA:
     · KEPPNIS-MERKID (Community Shield o.fl.) baetir ENGU ofan a
       "byrjadi sidasta": hopur A +0,0003 [-0,0083, +0,0081], hopur B
       NEIKVAETT -0,0083 [-0,0166, -0,0019]
     · "SEST I AEFINGALEIK" er FELLT SEM MERKI: 23 af 80 sogulegum
       klubb-timabilum eiga NULL lineups, svo "ekki sest" er thekju-
       eftirstodva, ekki upplysing. APPID MA ALDREI LESA "ekki sest"
       SEM "byrjadi ekki" — thess vegna er rodin `null`, ekki 0.

   ThETTA ER BIRTINGAR-HEIMILD, EKKI BURDARVIRKI. Hun fer HVERGI inn i
   `startProbability`, `expPointsFor` ne `rankScore` — sama hilla og BSD
   og Evropu-alagid (CLAUDE.md 4 og 6t): heimildin er ostadfest fyrir
   thennan tilgang, sogulega thekjan var 23/80, og maelingin styður ad
   SYNA hana, ekki ad VEGA hana.

   ---- HVAR I PIPELINE OG HVERS VEGNA ----
   DAGLEGA KEYRSLAN, EKKI `--fast`. Loknir aefingaleikir breytast ekki
   innan dags; hrada keyrslan gengur 48-96x a dag og hver full sokn er
   ~155 koll, svo `--fast` vaeri ~15.000 koll a dag fyrir NULL nyja
   upplysingu. Sama rok og `fetchBsdLive` er i daglegu keyrslunni.
   OG HUN STOPPAR ThEGAR TIMABILID BYRJAR. Aefingaleikir eru ORDNIR TIL
   thegar fyrsti PL-leikur er sparkadur og breytast aldrei aftur; ad
   endurreikna thad daglega i niu manudi er hreinn urgangur og ny
   bilunar-yfirbord. Frosin skra er svarid — sama roksemd og
   `season_baseline` og `data/history/` (CLAUDE.md 7).
   HUN ER KOLLUD UR `fetchFPL` og skilar vorpuninni, svo `players.json`
   getur bori svidin i SOMU keyrslu. Onnur leid (skrifa fyrst, merkja
   naesta dag) hefdi thagad um heilan dag — og dagurinn sem er eftir er
   einn.
   ============================================================ */
const FM = "https://www.fotmob.com/api/data";
/* FotMob svarar 200 med venjulegum vafra-UA og ENGUM token (maelt
   16. og 20.8.2026). CLAUDE.md kafli 6 sagdi "404/gated" og su slod
   (`/api/matchDetails`) er raunverulega 404 — hun FAERDIST.           */
const FM_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
            + "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
/* KOSTNADAR-ThAK. Full sokn a sumrinu 2026 er ~62 dagsetningar + ~93
   leikir = ~155 koll. Thokin eru rifleg efri mork, ekki stilltir fastar:
   thau eru til svo keyrslan geti ekki hengt daglegu sokninna sem hun
   liggur A UNDAN. Se thakid sprengt er skrain EKKI skrifud (sja nedar). */
const PRE_MAX_CALLS = 400;
const PRE_BUDGET_MS = 240000;

/* ============================================================
   KLUBBAR ERU FESTIR A FOTMOB-ID, ALDREI A NAFNI — TVAER MAELDAR VILLUR

   1. **"Arsenal" I FOTMOB ER TVEIR KLUBBAR.** Maelt 20.8.2026 a sumrinu
      2026: af 13 leikjum undir thvi nafni eru SEX i russnesku "First
      League" — FC Arsenal Tula. Nafna-porun hefdi talid lineups russnesks
      2. deildarlids sem forleik Arsenal og ENGINN vordur hefdi kvartad.
      Sami aettbogi og fuzzy-porunin sem fell Man United inn i Man City
      (`BSD_TEAM`, CLAUDE.md 6): ThOGUL RONG PORUN ER VERRI EN ENGIN.
   2. `matches?date=` ber SKAMMSTAFAD nafn ("Man City") en
      `matchDetails.lineup` ber LANGT ("Manchester City"). Fyrsta utgafa
      maelingarinnar fletti langa nafninu upp i skammstofudu toflunni, fekk
      `undefined` og `continue` — ThOGULT: 22 af 80 klubb-timabilum fengu
      NULL lineups. ThESS VEGNA er heima/uti PORAD EFTIR STODU
      (`homeTeam` -> `homeFpl`), aldrei eftir nafni.

   `leagues?id=47&season=YYYY/YYYY` gefur EXAKT 20 klubba thess timabils
   med FotMob-id (Arsenal = 9825). Nafnid er notad ADEINS her, i
   hand-stadfestri toflu ur theim 20 LONGU nofnum sem endapunkturinn
   skilar, og sóknin DEYR ef eitt theirra er ókunnugt.

   HVER FAERSLA ER FYLKI AF FPL-NOFNUM, EKKI EITT NAFN, OG ThAD ER MAELT:
   FPL notar SITT HVAD um sama klubb eftir timabili — i dag stendur
   "Coventry City", "Hull City" og "Ipswich Town" i `teams.json` medan
   nyliðar hafa adur stadid thar sem "Coventry", "Hull", "Ipswich"; og
   "Man Utd"/"Man United" og "Spurs"/"Tottenham" hafa bædi verid notud.
   Eitt harkodad nafn hefdi thvi fellt sóknina thann dag sem FPL
   endurnefndi klubb — sama tegund og horna-rodunin sem FPL endurnumeradi
   tvisvar a fimm dogum (CLAUDE.md 8). Fyrsta nafnid sem finnst i
   `teams.json` gildir.
   ============================================================ */
const FM_LONG_TO_FPL = {
  "Arsenal": ["Arsenal"], "Aston Villa": ["Aston Villa"],
  "AFC Bournemouth": ["Bournemouth"], "Bournemouth": ["Bournemouth"],
  "Brentford": ["Brentford"], "Brighton & Hove Albion": ["Brighton"],
  "Burnley": ["Burnley"], "Chelsea": ["Chelsea"],
  "Coventry City": ["Coventry City", "Coventry"],
  "Crystal Palace": ["Crystal Palace"], "Everton": ["Everton"], "Fulham": ["Fulham"],
  "Hull City": ["Hull City", "Hull"], "Ipswich Town": ["Ipswich Town", "Ipswich"],
  "Leeds United": ["Leeds", "Leeds United"], "Leicester City": ["Leicester", "Leicester City"],
  "Liverpool": ["Liverpool"], "Luton Town": ["Luton", "Luton Town"],
  "Manchester City": ["Man City"], "Manchester United": ["Man Utd", "Man United"],
  "Newcastle United": ["Newcastle"], "Norwich City": ["Norwich", "Norwich City"],
  "Nottingham Forest": ["Nott'm Forest"],
  "Sheffield United": ["Sheffield Utd", "Sheffield United"],
  "Southampton": ["Southampton"], "Sunderland": ["Sunderland"],
  "Tottenham Hotspur": ["Spurs", "Tottenham"], "Watford": ["Watford"],
  "West Ham United": ["West Ham"], "Wolverhampton Wanderers": ["Wolves"],
};

/* Minutur ur `substitutionEvents`. Byrjunarlidsmadur an subOut spiladi 90. */
function fmMinutes(pl, started) {
  const ev = pl?.performance?.substitutionEvents || [];
  const out = ev.find(e => e.type === "subOut"), inn = ev.find(e => e.type === "subIn");
  if (started) return out ? Math.max(0, Math.min(90, out.time)) : 90;
  if (inn) return Math.max(0, 90 - Math.min(90, inn.time));
  return 0;                                   // a bekknum, kom aldrei inn
}

async function fetchPreseason({ els, teams }) {
  /* SKRAARHEITID ER BOKSTAFLEGT I `writeJSON` NEDAR, EKKI BREYTA — OG ThAD
     ER VILJANDI. `tests/wiring.mjs` finnur skrifadar skrar med regexi a
     `writeJSON("x.json"` og les ADEINS fasta strengi; breytu-heiti hefdi
     latid skrana sleppa framhja vardinum an ThESS ad vera akvordun.
     `data/history/` er nakvaemlega thad gat i dag (CLAUDE.md 7) og thad er
     skjalfest sem GAT, ekki sem val.                                     */
  let prev = null;
  try { prev = JSON.parse(await readFile(`${DATA}/preseason.json`, "utf8")); } catch {}
  const prevPlayers = prev?.players && typeof prev.players === "object" ? prev.players : null;

  /* ---- MORKIN KOMA UR OKKAR EIGIN GOGNUM, ENGIN HARDKODUD DAGSETNING ----
     Fyrsti PL-leikur timabilsins. Leikur eftir hann er ekki forleikur.  */
  let fixturesArr = [];
  try { fixturesArr = JSON.parse(await readFile(`${DATA}/fixtures.json`, "utf8")); } catch {}
  const kicks = fixturesArr.filter(f => f?.event != null && f?.kickoff_time)
                           .map(f => Date.parse(f.kickoff_time)).filter(Number.isFinite);
  if (!kicks.length) {
    record("preseason", false, prevPlayers ? Object.keys(prevPlayers).length : 0,
      "fixtures.json carries no kickoff times, so the preseason cutoff cannot be derived "
      + "- KEPT the old file rather than guessing a date");
    return prevPlayers || {};
  }
  const cutoff = Math.min(...kicks);
  const cutDate = new Date(cutoff);
  const yr = cutDate.getUTCFullYear() - (cutDate.getUTCMonth() >= 6 ? 0 : 1);
  const season = `${yr}/${String(yr + 1).slice(2)}`;

  /* ---- FROSIN EFTIR FYRSTA LEIK ----
     Aefingaleikir eru ordnir til; talan getur ekki breyst. Skra sem er
     fyrir ThETTA timabil er einfaldlega notud afram og ENGIN koll gerd.  */
  if (Date.now() >= cutoff) {
    if (prevPlayers && prev.season === season) {
      record("preseason", true, Object.keys(prevPlayers).length,
        `FROZEN - the season started ${cutDate.toISOString().slice(0, 10)} and preseason results `
        + `cannot change, so the file from ${prev.updated} is reused with no requests`);
      return prevPlayers;
    }
    record("preseason", false, 0,
      `the season started ${cutDate.toISOString().slice(0, 10)} but no preseason file for ${season} `
      + "exists - the friendlies are over and cannot be collected after the fact, so the columns stay empty");
    return {};
  }

  /* ---- KLUBBARNIR, FESTIR A FOTMOB-ID ---- */
  let calls = 0;
  const t0 = Date.now();
  const cacheDir = process.env.PRESEASON_CACHE || null;   // adeins fyrir handvirkar keyrslur
  const budgetLeft = () => calls < PRE_MAX_CALLS && Date.now() - t0 < PRE_BUDGET_MS;
  const fmJson = async (url, file) => {
    if (cacheDir) {
      try { return JSON.parse(await readFile(`${cacheDir}/${file}`, "utf8")); } catch {}
    }
    calls++;
    /* TIMAMORK ERU SKYLDA (`tests/wiring.mjs`). FotMob svarar venjulega
       undir sekundu; 20 s er rifleg efri mork.                          */
    const r = await fetch(url, { headers: { "User-Agent": FM_UA },
                                 signal: AbortSignal.timeout(20000) });
    if (!r.ok) return { __http: r.status };
    const j = await r.json();
    if (cacheDir) { try { await mkdir(cacheDir, { recursive: true });
                          await writeFile(`${cacheDir}/${file}`, JSON.stringify(j)); } catch {} }
    return j;
  };

  const fplIdByName = {};
  for (const t of teams || []) fplIdByName[t.name] = t.id;
  const lg = await fmJson(`${FM}/leagues?id=47&season=${yr}%2F${yr + 1}`, `pl_${yr}.json`);
  if (lg.__http) throw new Error(`FotMob leagues?id=47 season ${yr}/${yr + 1}: HTTP ${lg.__http}`);
  const rowsTab = lg.table?.[0]?.data?.table?.all || lg.table?.[0]?.data?.table || [];
  const fplByFm = new Map();
  const unknown = [];
  for (const t of rowsTab) {
    const alias = FM_LONG_TO_FPL[t.name] || [];
    const id = alias.map(n => fplIdByName[n]).find(v => v != null);
    if (id == null) { unknown.push(t.name); continue; }
    fplByFm.set(t.id, id);
  }
  /* DEYR FREMUR EN AD PARA A NAFNI. Okunnugt langt nafn er nyliði sem
     vantar i toflunna — og thogul sleppa vaeri klubbur an aefingaleikja
     sem lítur út eins og klubbur sem spiladi ekki.                      */
  if (unknown.length) throw new Error(`FM_LONG_TO_FPL is missing: ${unknown.join(", ")}`);
  /* FJOLDINN ER LEIDDUR AF `teams`, EKKI HARDKODADUR 20. Fastur 20 hefdi
     verid rett i dag og THOGUL forsenda i morgun — sama tegund og
     harkodada safna-talan og "svidid er 4-10" (CLAUDE.md 5 og 8). Reglan
     sem gildir er: HVER klubbur sem FPL thekkir verdur ad leysast, annars
     er einn theirra kominn med engan forleik af thvi ad nafnid hvarf.   */
  const nClubs = (teams || []).length;
  if (fplByFm.size !== nClubs)
    throw new Error(`FotMob PL ${yr}/${yr + 1}: ${fplByFm.size} clubs resolved, `
      + `but FPL lists ${nClubs} - a club with no preseason must not be a lookup miss`);

  /* ---- LEIKIRNIR: 25. juni -> morkin ---- */
  const dates = [];
  for (const d = new Date(Date.UTC(yr, 5, 25)); d.getTime() < cutoff + 864e5;
       d.setUTCDate(d.getUTCDate() + 1)) dates.push(d.toISOString().slice(0, 10).replace(/-/g, ""));
  const fx = [];
  let httpFail = 0, late = 0;
  for (const ds of dates) {
    if (!budgetLeft()) break;
    const j = await fmJson(`${FM}/matches?date=${ds}`, `matches_${ds}.json`);
    if (j.__http) { httpFail++; continue; }
    for (const l of j.leagues || []) {
      if (+l.primaryId === 47 || +l.id === 47) continue;         // PL sjalf
      for (const m of l.matches || []) {
        const h = fplByFm.get(m.home?.id), a = fplByFm.get(m.away?.id);
        if (h == null && a == null) continue;
        const ts = m.status?.utcTime ? Date.parse(m.status.utcTime) : null;
        if (ts != null && ts >= cutoff) { late++; continue; }
        fx.push({ matchId: m.id, comp: l.name, homeFpl: h ?? null, awayFpl: a ?? null,
                  utc: m.status?.utcTime || null, finished: !!m.status?.finished });
      }
    }
  }

  /* ---- BYRJUNARLIDIN ---- */
  const agg = new Map();                       // `${fplTeamId}|${fotmobName}` -> rod
  const lineupsPerClub = new Map();
  let sides = 0, mdFail = 0, incomplete = false;
  for (const f of fx) {
    if (!f.finished) continue;
    if (!budgetLeft()) { incomplete = true; break; }
    const j = await fmJson(`${FM}/matchDetails?matchId=${f.matchId}`, `md_${f.matchId}.json`);
    if (j.__http || !j.content?.lineup) { mdFail++; continue; }
    for (const side of ["homeTeam", "awayTeam"]) {
      const t = j.content.lineup[side];
      const tid = side === "homeTeam" ? f.homeFpl : f.awayFpl;   // STODU-PORUN, ekki nafna
      if (!t || tid == null || !(t.starters || []).length) continue;
      sides++;
      lineupsPerClub.set(tid, (lineupsPerClub.get(tid) || 0) + 1);
      const rows = [...(t.starters || []).map(p => [p, true]),
                    ...(t.subs || []).map(p => [p, false])];
      for (const [p, st] of rows) {
        const key = `${tid}|${p.name}`;
        let e = agg.get(key);
        if (!e) agg.set(key, e = { team: tid, name: p.name, games: 0, starts: 0, minutes: 0,
                                   lastStart: 0, utcLast: 0 });
        e.games++; e.minutes += fmMinutes(p, st);
        if (st) e.starts++;
        const ts = f.utc ? Date.parse(f.utc) : 0;
        if (ts >= e.utcLast) { e.utcLast = ts; e.lastStart = st ? 1 : 0; }
      }
    }
  }
  if (!budgetLeft()) incomplete = true;

  /* HALFUR GLUGGI MA ALDREI SKRIFAST OFAN A HEILAN (kafli 8e). Sprungid thak
     eda throtinn timi gefur RETTAR tolur um FAERRI leiki — sem les eins og
     "hann byrjadi sjaldnar", ekki eins og "vid soktum minna".            */
  if (incomplete) {
    record("preseason", false, prevPlayers ? Object.keys(prevPlayers).length : 0,
      `budget exhausted after ${calls} requests / ${Math.round((Date.now() - t0) / 1000)}s with `
      + `${fx.filter(f => f.finished).length} finished friendlies still to read - KEPT the old file, `
      + "because a partial sweep reports real numbers over fewer matches and reads like fewer starts");
    return prevPlayers || {};
  }

  /* ---- PORUN VID FPL: NAFN INNAN KLUBBS ----
     Skorad med `nameScore` (sama fall og skotakortid og lineups nota),
     throskuldur 1,5 = eitt sameiginlegt tak PLUS sama eftirnafn. Laegri
     throskuldur pardi "Danny Ings" vid "Danny Ward" i maelingunni.
     ROD FOTMOB ER NYTT MEST EINU SINNI, og valid er GERT I SKORS-ROD med
     jafntefli brotid a fostum lyklum — annars gaefu tvaer keyrslur sitt
     hvora porun (sama regla og BSD: "fastur event-id rodun").           */
  const pairs = [];
  const byTeam = new Map();
  for (const e of agg.values()) (byTeam.get(e.team) || byTeam.set(e.team, []).get(e.team)).push(e);
  for (const p of els || []) {
    const cands = byTeam.get(p.team) || [];
    for (const c of cands) {
      const s = Math.max(nameScore(p.web_name, c.name),
                         nameScore(`${p.first_name} ${p.second_name}`, c.name));
      if (s >= 1.5) pairs.push({ s, code: p.code, id: p.id, c });
    }
  }
  pairs.sort((a, b) => b.s - a.s || a.id - b.id || (a.c.name < b.c.name ? -1 : 1));
  const usedRow = new Set(), players = {};
  for (const q of pairs) {
    if (usedRow.has(q.c) || players[q.code]) continue;
    usedRow.add(q.c);
    players[q.code] = { starts: q.c.starts, games: q.c.games, minutes: q.c.minutes,
                        last_start: q.c.lastStart };
  }

  /* ThEKJA ER FULLYRDING, EKKI LOGGA (CLAUDE.md 5b regla 1) — hun er
     TOLUD i skrana svo `tests/preseason.mjs` og `status.json` geti
     fallid thegar klubbar hverfa. Klubbur med NULL lineups er ekki
     "klubbur sem spiladi ekki"; hann er nafn sem hvarf a leidinni.     */
  const clubs = {};
  for (const t of teams || []) clubs[t.id] = lineupsPerClub.get(t.id) || 0;
  const covered = Object.values(clubs).filter(n => n > 0).length;
  const finishedN = fx.filter(f => f.finished).length;

  /* ============================================================
     AFTURFOR ER EKKI FRETT — GAMLA SKRAIN STENDUR (kafli 8e)

     Innan sumarsins geta aefingaleikir ADEINS FJOLGAD: leikur sem var
     spiladur i gaer verdur ekki ospiladur i dag. Keyrsla sem finnur FAERRI
     thakta klubba eda FAERRI lokna leiki en skrain a diski hefur thvi ekki
     maelt aefingaleiki — hun hefur maelt bilun (dagsetningar-kall sem 404-adi,
     FotMob-snid sem breyttist, ovaent tomt `lineup`-svid). Og tolurnar sem
     hun skrifadi vaeru RAUNVERULEGAR um FAERRI leiki, sem les eins og
     "hann byrjadi sjaldnar" — nakvaemlega su tegund af tolu sem er rong OG
     truverdug (CLAUDE.md 3).

     ThETTA ER EIN REGLA SEM TEKUR ThRENNT: tom keyrsla (0 klubbar), hluta-
     keyrsla (thak/timi sprungid) og thekju-hrun. `players` er VILJANDI EKKI
     maelikvardinn — leikmadur getur horfid ur `els` (farinn ur deildinni) og
     tha faekkar podum af rettri astaedu.
     Vordur: `tests/preseason.mjs` kafli D, thar sem stokkbreyting sem skrifar
     samt fellur.                                                          */
  const sameSeason = prev && prev.season === season;
  const wasCovered = sameSeason ? (+prev.clubs_covered || 0) : 0;
  const wasFinished = sameSeason ? (+prev.finished || 0) : 0;
  if (sameSeason && (covered < wasCovered || finishedN < wasFinished)) {
    record("preseason", false, prevPlayers ? Object.keys(prevPlayers).length : 0,
      `REGRESSION - this sweep found ${covered} covered clubs over ${finishedN} finished friendlies `
      + `but the file on disk has ${wasCovered} over ${wasFinished}, and friendlies can only ever be `
      + "added during a summer - KEPT the old file, because real numbers over fewer matches read "
      + "like fewer starts");
    return prevPlayers || {};
  }
  await writeJSON("preseason.json", {
    updated: status.updated, season, source: "FotMob",
    cutoff: cutDate.toISOString(),
    fixtures: fx.length, finished: finishedN,
    lineup_sides: sides, dropped_after_cutoff: late,
    date_requests_failed: httpFail, match_requests_failed: mdFail, requests: calls,
    clubs, clubs_covered: covered, matched: Object.keys(players).length,
    note: "Preseason friendly starts and minutes per FPL player code, from FotMob. CONTEXT ONLY: "
        + "nothing in FFDR, start probability, expected points or the ranking reads this file. "
        + "Clubs are pinned by FotMob id, never by name - 'Arsenal' on FotMob is also FC Arsenal Tula "
        + "of the Russian second tier, and 6 of 13 fixtures under that name in summer 2026 were theirs. "
        + "Only matches kicking off before the season's first Premier League fixture are counted. "
        + "A player with no row was NOT SEEN, which is not the same as 'did not start': 23 of 80 "
        + "historical club-seasons have zero lineups here, so absence is a coverage gap and the app "
        + "must show it as empty, never as zero.",
    players,
  });
  /* `ok` ER `covered > 0` OG ThAD ER AKVORDUN: forleiks-heimild med NULL
     thoktum klubbum er ekki "bidur timabils" (sbr. `fdcouk_e0`, sem er graen
     medan skrain er ekki til enn) heldur heimild sem gefur enga tolu medan
     leikirnir ERU spiladir. Rautt ljos i nokkra daga snemma i juni er retta
     einkennid og thad slokknar sjalft.                                    */
  record("preseason", covered > 0, Object.keys(players).length,
    `${season} - ${finishedN} friendlies, ${sides} lineup sides, `
    + `${covered} of ${(teams || []).length} clubs covered, ${calls} requests`
    + `${covered ? "" : " - NO club has a published lineup yet, so every column is empty (not zero)"}`);
  return players;
}

/* ========== 1. FPL — kjarninn, fellir keyrsluna ef hann brestur ========== */
const FPL = "https://fantasy.premierleague.com/api";
let bootstrap, teamsById = {}, shortById = {};

async function fetchFPL() {
  bootstrap = await getJSON(`${FPL}/bootstrap-static/`);
  const teams = bootstrap.teams || [];
  const events = bootstrap.events || [];
  const els = bootstrap.elements || [];

  // teams.json + teams_map.json
  teams.forEach(t => { teamsById[t.id] = t; shortById[t.id] = t.short_name; });
  const teamsOut = teams.map(t => ({ id:t.id, name:t.name, short:t.short_name, code:t.code,
    strength:t.strength, strength_overall_home:t.strength_overall_home,
    strength_overall_away:t.strength_overall_away,
    strength_attack_home:t.strength_attack_home, strength_attack_away:t.strength_attack_away,
    strength_defence_home:t.strength_defence_home, strength_defence_away:t.strength_defence_away }));
  await writeJSON("teams.json", { updated: status.updated, teams: teamsOut });
  // chips (nöfn/ikon fyrir framenda) ef til í bootstrap
  if (bootstrap.chips) await writeJSON("chips.json", bootstrap.chips);

  const map = {};
  for (const t of teams) {
    const sn = t.short_name;
    const coord = COORDS[sn];
    const nm = NAMES[sn];
    if (!coord) console.warn(`WARNING: no coordinates for ${sn} (${t.name})`);
    if (!nm)    console.warn(`WARNING: no name mapping for ${sn} (${t.name})`);
    map[t.id] = {
      fpl: t.name, short: sn,
      clubelo: nm?.clubelo ?? null, fdcouk: nm?.fdcouk ?? null, understat: nm?.understat ?? null,
      lat: coord?.[0] ?? null, lon: coord?.[1] ?? null, badge: null,
    };
  }
  await writeJSON("teams_map.json", map);

  /* ---- AEFINGALEIKJA-BYRJANIR (kafli 0b) ----
     Kollud HER, a undan `players.json`, svo svidin komist i SOMU skra i
     SOMU keyrslu. Hun deyr aldrei med keyrslunni: brestur skilar tomri
     vorpun og dalkarnir verda tomir, sem er RETTA birtingin.            */
  let preseason = {};
  try { preseason = await fetchPreseason({ els, teams }); }
  catch (e) { record("preseason", false, 0, e.message); }

  // players.json — valið svið (ekki hrátt 2MB)
  const pick = els.map(e => ({
    id:e.id, web_name:e.web_name, first_name:e.first_name, second_name:e.second_name,
    team:e.team, element_type:e.element_type, code:e.code,
    now_cost:e.now_cost, cost_change_start:e.cost_change_start, cost_change_event:e.cost_change_event,
    selected_by_percent:e.selected_by_percent, transfers_in_event:e.transfers_in_event,
    transfers_out_event:e.transfers_out_event, total_points:e.total_points,
    points_per_game:e.points_per_game, form:e.form, ep_next:e.ep_next, minutes:e.minutes,
    goals_scored:e.goals_scored, assists:e.assists, clean_sheets:e.clean_sheets,
    goals_conceded:e.goals_conceded, bonus:e.bonus, bps:e.bps,
    expected_goals:e.expected_goals, expected_assists:e.expected_assists,
    expected_goals_conceded:e.expected_goals_conceded,
    expected_goal_involvements:e.expected_goal_involvements, ict_index:e.ict_index,
    defensive_contribution:e.defensive_contribution,
    clearances_blocks_interceptions:e.clearances_blocks_interceptions,
    tackles:e.tackles, recoveries:e.recoveries,
    status:e.status, chance_of_playing_next_round:e.chance_of_playing_next_round,
    chance_of_playing_this_round:e.chance_of_playing_this_round, news:e.news,
    news_added:e.news_added,
    // ---- spjöld og bönn (bann-hætta) ----
    yellow_cards:e.yellow_cards, red_cards:e.red_cards,
    // ---- byrjunarlið / skiptingar-hætta ----
    starts:e.starts, starts_per_90:e.starts_per_90,
    // ---- fastaleikir: vítatakarar og hornaspyrnur ----
    penalties_order:e.penalties_order,
    corners_and_indirect_freekicks_order:e.corners_and_indirect_freekicks_order,
    direct_freekicks_order:e.direct_freekicks_order,
    penalties_saved:e.penalties_saved, penalties_missed:e.penalties_missed,
    /* ---- OPINBERAR FPL-TOLUR SEM VID REIKNADUM SJALF ADUR ----
       FPL gefur thessar tolur sjalft. Ad reikna thaer sjalf var tvitekning
       sem vid thurftum ad verja; nu birtum vid theirra tolu.
       (Prof: value_season == total_points/verd a ollum raungognum.)      */
    value_season:e.value_season, value_form:e.value_form,
    saves_per_90:e.saves_per_90,
    defensive_contribution_per_90:e.defensive_contribution_per_90,
    clean_sheets_per_90:e.clean_sheets_per_90,
    goals_conceded_per_90:e.goals_conceded_per_90,
    expected_goals_conceded_per_90:e.expected_goals_conceded_per_90,
    /* cost_change_event er THEGAR ofar i listanum (lina ~154).            */
    /* ---- FPL-SAETI INNAN STODU (`_rank_type`) ----
       `_rank` er medal ALLRA leikmanna; `_rank_type` er medal leikmanna I
       SOMU STODU og er thad sem skiptir mali i fantasy.
       Maelt: Raya stig/leik 4,4 -> rank_type 3 (3. besti GK) en rank 32.  */
    points_per_game_rank_type:e.points_per_game_rank_type,
    form_rank_type:e.form_rank_type,
    ict_index_rank_type:e.ict_index_rank_type,
    influence_rank_type:e.influence_rank_type,
    creativity_rank_type:e.creativity_rank_type,
    threat_rank_type:e.threat_rank_type,
    selected_rank_type:e.selected_rank_type,
    now_cost_rank_type:e.now_cost_rank_type,
    // ---- per-90 (betri samanburður en árstíðarsummur) ----
    expected_goals_per_90:e.expected_goals_per_90,
    expected_assists_per_90:e.expected_assists_per_90,
    expected_goal_involvements_per_90:e.expected_goal_involvements_per_90,
    /* xGC/90 og CS/90 eru THEGAR i "OPINBERAR FPL-TOLUR"-blokkinni ad ofan —
       ekki endurtaka their her (esbuild varar vid tviteknum lyklum).       */
    // ---- ICT-þættir og raðir ----
    influence:e.influence, creativity:e.creativity, threat:e.threat,
    form_rank:e.form_rank, points_per_game_rank:e.points_per_game_rank,
    selected_rank:e.selected_rank, now_cost_rank:e.now_cost_rank,
    dreamteam_count:e.dreamteam_count,
    saves:e.saves, own_goals:e.own_goals,
    /* ---- AEFINGALEIKIR (kafli 0b) — SVIDIN VANTA ALVEG ThEGAR HANN SAST
       EKKI, ThAU ERU EKKI 0. `num(undefined)` er null i `stats.js`, svo
       holfid syndir "—" og radast sidast i BADAR attir. Ad skrifa `null`
       berum orðum vaeri jafngott en 587 auk lykla i skranni; ad skrifa 0
       vaeri "ekki sest" birt sem "byrjadi ekki" — MAELT OG FELLT.       */
    ...(preseason[e.code] ? {
      preseason_starts:     preseason[e.code].starts,
      preseason_games:      preseason[e.code].games,
      preseason_minutes:    preseason[e.code].minutes,
      preseason_last_start: preseason[e.code].last_start,
    } : {}),
  }));
  await writeJSON("players.json", { updated: status.updated, players: pick });

  /* ============================================================
     events.json (umferðir) — OG FJOLDA-SVIDIN ERU GEYMD SEM ARKIV (16.8.2026)

     Vid afritudum 7 af 29 lyklum. Hinir 22 eru mest afleiddir eda ONYTIR
     (`deadline_time_epoch`, `can_enter`, `cup_leagues_created` …) — EN TOLF
     theirra eru ThAD SEM FJOLDINN GERDI, og thau eru OENDURHEIMTANLEG:

       most_captained · most_vice_captained · most_selected ·
       most_transferred_in · top_element · top_element_info · highest_score ·
       highest_scoring_entry · chip_plays · transfers_made · ranked_count ·
       data_checked

     TVAER OHADAR ASTAEDUR TIL AD SKRIFA ThAU NUNA:
       1. FPL geymir thau ADEINS fyrir YFIRSTANDANDI timabil og nullstillir
          vid vendingu. "Hvad gerdi fjoldinn i GW7 2026/27" er ekki til
          neins stadar i thessu repo-i og verdur ekki til eftir a.
       2. `chip_plays` og `transfers_made` BREYTAST INNAN UMFERDAR (telja
          upp fram ad frestinum), svo ferillinn fæst adeins ur ENDURTEKNUM
          myndum — ein mynd eftir a er endapunktur, ekki throun.
     Sama roksemd og `data/history/` og `data/predictions/` (CLAUDE.md 7):
     dagleg mynd verdur ekki buin til eftir a.

     MAELT 16.8.2026 a lifandi bootstrap (38 umferdir, forleikur, oll
     fjolda-sviðin enn null/tom): 5.578 b -> 15.572 b (+9.994 b). Talan
     vex thegar sviðin fyllast; `top_element_info` og `chip_plays` eru einu
     hlutirnir/fylkin i hopnum.

     OG ThETTA ER ARKIV, EKKI MERKI — MORKIN ERU MAELD OG ThAU STANDA.
     CLAUDE.md kafli 4: "Skipta-hreyfing fjoldans sem merki" var maeld a 4
     timabilum, 104.160 leikmanna-umferdum, og er NULL ofan a `ep_next`
     (r = -0,0005, 95% CI [-0,019, +0,019]) og NEIKVAED medal theirra sem
     spiludu (-0,111). Ad GEYMA toluna er annad en ad NOTA hana. Ekkert i
     `src/` ma lesa thessi svid, og ad vira eitthvert theirra inn i rodun
     eda radgjof krefst NYRRAR MAELINGAR fyrst. Vordur: `tests/wiring.mjs`
     (kafli "ARKIV-SVID").
     ============================================================ */
  await writeJSON("events.json", { updated: status.updated, events: events.map(ev => ({
    id:ev.id, name:ev.name, deadline_time:ev.deadline_time, finished:ev.finished,
    is_current:ev.is_current, is_next:ev.is_next, average_entry_score:ev.average_entry_score,
    // ---- ARKIV: skrifad, ALDREI lesid af appinu (sja hausinn) ----
    most_captained:ev.most_captained, most_vice_captained:ev.most_vice_captained,
    most_selected:ev.most_selected, most_transferred_in:ev.most_transferred_in,
    top_element:ev.top_element, top_element_info:ev.top_element_info,
    highest_score:ev.highest_score, highest_scoring_entry:ev.highest_scoring_entry,
    chip_plays:ev.chip_plays, transfers_made:ev.transfers_made,
    ranked_count:ev.ranked_count, data_checked:ev.data_checked })) });

  record("fpl_bootstrap", true, els.length, `${teams.length} teams, ${events.length} gameweeks`);

  // fixtures.json
  const fixtures = await getJSON(`${FPL}/fixtures/`);
  await writeJSON("fixtures.json", fixtures.map(f => ({
    id:f.id, event:f.event, kickoff_time:f.kickoff_time, finished:f.finished,
    started:f.started, minutes:f.minutes, finished_provisional:f.finished_provisional,
    team_h:f.team_h, team_a:f.team_a, team_h_score:f.team_h_score, team_a_score:f.team_a_score,
    team_h_difficulty:f.team_h_difficulty, team_a_difficulty:f.team_a_difficulty })));
  record("fpl_fixtures", true, fixtures.length);

  /* Dagleg verðmynd -> data/history/YYYY-MM-DD.json (byggir verðbreytinga-tímaröð).

     `ep_next` / `ep_this` / `chance_next` BÆTTUST VIÐ 9.8.2026 OG ÁSTÆÐAN ER
     MÆLING SEM VAR EKKI HÆGT AÐ KLÁRA. Spurningin var hvort skipta-hreyfing
     fjöldans beri merki UMFRAM það sem líkanið veit þegar. Svarið fer eftir
     því hvað er stjórnað fyrir (4 tímabil, 104.160 leikmanna-umferðir):

       gegn hráu formi (fyrri 3 umferðir) ....... r = +0,248  [0,230, 0,264]
       gegn `xP` úr vaastav-speglinum ........... r = −0,0005 [−0,019, +0,019]

     Munurinn skiptir öllu — og HVORUGT svarið er hægt að treysta, því `xP`
     í speglinum er SÓTT EFTIR að umferðin kláraðist. Það er engin leið að
     sanna afturvirkt að talan hafi verið til FYRIR frest.

     Þessi fjögur svið loka þeirri gátt í eitt skipti fyrir öll: dagleg mynd
     TEKIN FYRIR frest getur ekki verið menguð af útkomunni. Kostnaðurinn er
     ~4 svið á skrá sem er þegar skrifuð.

     ÞETTA VERÐUR EKKI TIL EFTIR Á. Sama regla og verðmyndin sjálf (kafli 7):
     dagleg mynd er óendurheimtanleg — byrji hún ekki núna er mælingin ekki
     möguleg í vetur heldur.                                              */
  const snap = els.map(e => ({ id:e.id, now_cost:e.now_cost, cost_change_event:e.cost_change_event,
    selected_by_percent:e.selected_by_percent, transfers_in_event:e.transfers_in_event,
    transfers_out_event:e.transfers_out_event, total_points:e.total_points,
    ep_next:e.ep_next, ep_this:e.ep_this,
    chance_next:e.chance_of_playing_next_round, status:e.status,
    /* MINUTUR, xGI OG FORM BAETTUST VID 10.8.2026 af nakvaemlega somu astaedu
       og ep_next: spurningin "hvers vegna keyptu their hann THA?" er
       osvaranleg eftir a. `players.json` er ENDURSKRIFUD daglega — hun er
       nuverandi stada, ekki saga — svo thetta er eina staerdin i repo-inu
       sem geymir samhengid a theim degi sem skiptin voru gerd.           */
    minutes:e.minutes, xgi:e.expected_goal_involvements, form:e.form }));
  await writeJSON(`history/${today}.json`, snap);
  record("fpl_history_snapshot", true, snap.length, today);

  // ---- TÍMABILS-GRUNNUR fyrir "í fyrra"-dálkinn í yfirlitinu ----
  // FYRIR tímabil eru uppsöfnuðu tölurnar í bootstrap LOKATÖLUR fyrra
  // tímabils. Við skrifum þær daglega MEÐAN engin umferð er lokin; um
  // leið og GW1 klárast hættum við að skrifa -> skráin FRÝS sem
  // 2025/26-lokatölurnar og appið getur sýnt "í ár vs. í fyrra".
  if (!events.some(ev => ev.finished)) {
    const y = new Date(events[0]?.deadline_time || Date.now()).getFullYear();
    await writeJSON("season_baseline.json", {
      updated: status.updated,
      label: `${y - 1}/${String(y).slice(-2)}`,
      note: "Final totals for last season. Written daily UP TO GW1, then frozen.",
      players: els.map(e => ({
        id: e.id, total_points: e.total_points, minutes: e.minutes,
        points_per_game: e.points_per_game, starts: e.starts,
        goals_scored: e.goals_scored, assists: e.assists,
        expected_goals: e.expected_goals, expected_assists: e.expected_assists,
        clean_sheets: e.clean_sheets, yellow_cards: e.yellow_cards, red_cards: e.red_cards,
      })),
    });
    record("season_baseline", true, els.length, "preseason — refreshed daily");
  } else {
    record("season_baseline", true, 0, "frozen (season under way)");
  }

  // event/{gw}/live/ fyrir LOKNAR umferðir. Fyrsta keyrsla: allar. Eftir það: nýjustu.
  const finished = events.filter(ev => ev.finished).map(ev => ev.id);
  let liveCount = 0;
  for (const gw of finished) {
    const path = `live/gw${gw}.json`;
    if (existsSync(`${DATA}/${path}`)) continue; // þegar sótt (loknar umferðir breytast ekki)
    try {
      const live = await getJSON(`${FPL}/event/${gw}/live/`);
      // geymum explain ÓSKERT + tölfræði
      await writeJSON(path, live);
      liveCount++;
    } catch (e) { console.warn(`live gw${gw} failed: ${e.message}`); }
  }
  // núverandi umferð (gæti verið hálfnuð) — alltaf endursækja
  const cur = events.find(ev => ev.is_current);
  if (cur) { try { const live = await getJSON(`${FPL}/event/${cur.id}/live/`); await writeJSON(`live/gw${cur.id}.json`, live); liveCount++; } catch (e) { console.warn(e.message); } }
  record("fpl_live", true, liveCount, `${finished.length} finished gameweeks`);

  // set-piece notes (víta/horn)
  try {
    const sp = await getJSON(`${FPL}/team/set-piece-notes/`);
    await writeJSON("set_piece_notes.json", sp);
    record("fpl_set_piece", true, (sp.teams||sp||[]).length);
  } catch (e) { record("fpl_set_piece", false, 0, e.message); }

  return { events, els };
}

/* ========== 2. DEFCON — afleitt úr live, umferð fyrir umferð ========== */
/* ========== 2b. DC-HITTNI FYRRI TIMABILA (defcon_history.json) ==========
   Notandinn vill sja DC-hittni a SOGULEGUM timabilum, ekki bara thvi
   yfirstandandi. Hraefnid er thegar i repo-inu: data/player_gw_{s}.json
   ber `dc` (= FPL `defensive_contribution`, TALNINGIN 1-27, ekki stigin)
   per leikmann per umferd. ENGIN NY KOLL.

   HORD SKORDA SEM MA EKKI FELA: `dc` er AÐEINS til fra 2025/26 — DefCon
   er ny stigagjof. Maelt a raungognum: 2122/2223/2324/2425 hafa NULL
   raðir med dc>0, 2526 hefur 9.620. Skrain ber thvi adeins thau timabil
   sem eiga gogn, og appid synir "—" (VANTAR) fyrir hin — sem er RETT
   svar, ekki 0%.

   Somu throskuldar og computeDefcon notar (DEF 10, MID/FWD 12) og SAMA
   afturvirkni (empirisk Bayes, K=10 ad stodu-medaltali) svo tolurnar
   seu SAMBAERILEGAR vid yfirstandandi timabil.                        */
/* ========== 2c. ARON-STUDULLINN (JOFNUDUR) — consistency.json ==========
   SPURNINGIN: "hverjir fa ALLTAF 4-6 stig thegar their spila, i stad thess
   ad fa 2 og 2 og 2 og svo 11?" Talan er LYSING A FORTID, ekki spa — og
   thad er MAELT, ekki agiskad:

   MAELT 7.8.2026 a 5 timabilum (player_gw_*.json):
     · hit4 fylgir stigum/leik med r = 0,90 — thad er ad miklu leyti SAMA
       talan. Engin throskuldur (>=3/4/5/6/7) sleppur undan thvi.
     · Ad velja topp-20 eftir hit4 gaf +1,4 prosentustig i hittni naesta ar
       — en ABATINN SKIPTIR FORMERKI milli throskulda (+0,6 / +1,4 / -0,6 /
       +1,4 / -1,0). Thad er havada-undirskrift.
     · VERD raedur miklu: r(verd, ppg) = 0,43-0,66, r(verd, hit4) = 0,22-0,54.
     · ThEGAR STJORNAD ER FYRIR ppg OG VERDI, INNAN STODU, hverfur allt:
       DEF r=0,12 og MID r=0,13 (2*SE = 0,21-0,27) og formerkin flakka.
   NIDURSTADA: jofnudur er EKKI sjalfstaedur, varanlegur eiginleiki. Hann
   fer thvi ALDREI i rankScore — thad vaeri ad verdleggja havada (kafli 3).
   Hann er birtur sem LYSING, med theim fyrirvara i tooltip.

   RETTA NOTKUNIN: bera saman menn i SOMU STODU a SVIPUDU VERDI. Thar
   segir studullinn hvor gefur 4-6 vikulega og hvor laetur thig bida eftir
   sprengingunni. Milli stada eda verdflokka er hann marklaus.

   Somu afturvirkni og DC-hittnin (K=10 ad stodu-medaltali) svo madur med
   3 leiki fai ekki 100%.                                              */
async function computeConsistency() {
  const K = 10;
  const seasons = {};
  let files = 0;
  for (const f of await readdir(DATA)) {
    const m = /^player_gw_(\d{4})\.json$/.exec(f);
    if (!m) continue;
    let d; try { d = JSON.parse(await readFile(`${DATA}/${f}`, "utf8")); } catch { continue; }
    const inv = {};
    for (const [i, name] of Object.entries(d.stats || {})) inv[name] = +i;
    if (inv.pts == null || inv.mins == null) continue;
    const out = {};
    for (const [code, row] of Object.entries(d.players || {})) {
      let games = 0, hit4 = 0, blank = 0, sum = 0;
      for (const g of Object.values(row.gw || {})) {
        if ((g[inv.mins] ?? 0) <= 0) continue;          // ADEINS leiknir leikir
        const pts = g[inv.pts] ?? 0;
        games++; sum += pts;
        if (pts >= 4) hit4++;
        if (pts <= 2) blank++;
      }
      if (games > 0) out[code] = { pos: row.p, games, hit4, blank, sum };
    }
    if (!Object.keys(out).length) continue;
    /* p0 per stodu ur SOMU gognum — afturvirkni fyrir litil syni. */
    const pool = {};
    for (const r of Object.values(out)) {
      const q = pool[r.pos] || (pool[r.pos] = { h4: 0, bl: 0, g: 0 });
      q.h4 += r.hit4; q.bl += r.blank; q.g += r.games;
    }
    for (const r of Object.values(out)) {
      const q = pool[r.pos], ok = q && q.g >= 50;
      const p4 = ok ? q.h4 / q.g : 0.28, pb = ok ? q.bl / q.g : 0.55;
      r.ppg      = +(r.sum / r.games).toFixed(2);
      r.hit4_pct = +((r.hit4 + K * p4) / (r.games + K)).toFixed(3);
      r.blank_pct= +((r.blank + K * pb) / (r.games + K)).toFixed(3);
      /* ARON-STUDULLINN: hittni MINUS klur — nakvaemlega hugmyndin
         ("4+ er gott, 1-2 er galli"). Bil: -1 .. +1.                  */
      r.aron     = +(r.hit4_pct - r.blank_pct).toFixed(3);
      delete r.sum;
    }
    seasons[d.label || m[1]] = out;
    files++;
  }
  await writeJSON("consistency.json", {
    updated: status.updated, seasons,
    note: "ARON INDEX (consistency). hit4_pct/blank_pct = share of PLAYED "
        + "matches with >=4 / <=2 points, SHRUNK (K=10 towards the "
        + "positional mean). aron = hit4_pct - blank_pct. A DESCRIPTION OF THE PAST, "
        + "NOT A FORECAST: measured over 5 seasons, hit4 tracks points/match at r=0.90, "
        + "and once you control for points AND PRICE within a position there is no "
        + "lasting residual (DEF 0.12 / MID 0.13, signs flip). Compare "
        + "players in the SAME POSITION at a SIMILAR PRICE.",
  });
  record("consistency", true, files,
    `${files} seasons: ${Object.entries(seasons).map(([k, v]) => `${k} (${Object.keys(v).length})`).join(", ")}`);
}

async function computeDefconHistory() {
  const DC_K = 10;
  const DC_P0_FALLBACK = { DEF: 0.27, MID: 0.17, FWD: 0.10 };   // GK: utilokadir, sja ofar
  const POS_THRESH = { GK: 10, DEF: 10, MID: 12, FWD: 12 };
  const seasons = {};
  let files = 0;
  for (const f of await readdir(DATA)) {
    const m = /^player_gw_(\d{4})\.json$/.exec(f);
    if (!m) continue;
    let d; try { d = JSON.parse(await readFile(`${DATA}/${f}`, "utf8")); } catch { continue; }
    const inv = {};
    for (const [i, name] of Object.entries(d.stats || {})) inv[name] = +i;
    if (inv.dc == null) continue;
    const out = {};
    for (const [code, row] of Object.entries(d.players || {})) {
      const pos = row.p;
      /* MARKMENN EIGA ENGA DEFCON-TOLU — MAELT, EKKI ALYKTAD (17.8.2026).
         `data/player_gw_2526.json`: markmenn eiga **757 leikja-umferdir,
         750 byrjanir og NULL DefCon-stig, hamark 0** — a moti DEF 6,24 ad
         medaltali (hamark 27), MID 5,75 (29), FWD 2,86 (21). Their eru
         ekki gjaldgengir i stigagjofina. Adur skrifudust 40 GK-radir med
         `hit_rate: 0` og raunverulegri `starts`-tolu, svo taflan sagdi
         "0% af 36" — MAELINGAR-FULLYRDING um taekifaeri sem eru ekki til.
         Sama regla og mo/ao a markmonnum ("MAELINGA-REGLA, EKKI SNYRTING").
         `DC_P0_FALLBACK.GK = 0,02` er thar med daudur og gat aldrei verid
         annad en tilbuid forgildi.                                       */
      if (pos === "GK") continue;
      const th = POS_THRESH[pos] ?? 12;
      /* NEFNARINN ERU BYRJANIR, EKKI LEIKIR (lagad 17.8.2026).
         Gatid var `if (mins <= 0) continue` og talan sem for i `starts`
         taldi thvi HVERJA INNKOMU. Sannad: hun jafngildir leikja-talningu
         fyrir 537 af 537 leikmonnum en byrjunum fyrir adeins 81.
         Hver innkoma af bekknum — thar sem 10/12-throskuldurinn er
         ORNAEDANLEGUR a 10-20 minutum — taldist ThVI SEM MISS.
         Maelt a 2025/26, utileikmenn: hittni a leiki **0,1361** en a
         byrjanir **0,1907 (+40%)**; per stodu DEF 0,2134 -> 0,2632,
         MID 0,1133 -> 0,1675, FWD 0,0078 -> 0,0134.
         OG SKEKKJAN KOM TVISVAR VID: `p0` (samdrattar-forgildid) er
         reiknad ur SOMU summum, svo adlagada talan dro alla ad medaltali
         sem var sjalft vanmetid. Badar noturnar a skjanum sogdu "starts"
         allan timann — kodinn, ekki textinn, var rangur.                */
      let starts = 0, hits = 0;
      for (const g of Object.values(row.gw || {})) {
        if ((g[inv.starts] ?? 0) <= 0) continue;
        const dc = g[inv.dc];
        if (dc == null) continue;          // timabil an DefCon -> ekki talid
        starts++;
        if (dc >= th) hits++;
      }
      if (starts > 0) out[code] = { pos, starts, hits };
    }
    /* TIMABIL AN DEFCON ER SLEPPT — MAELT: i 2122-2425 er `dc` skrifad
       sem 0 (ekki null), svo an thessarar sidu hefdi hver leikmadur fengid
       hittni 0,000 sem LITUR UT EINS OG MAELING en er "gognin eru ekki
       til". Nakvaemlega gildran sem kafli 3 fordast. Krafa: einhver i
       timabilinu tharf ad hafa NAD throskuldinum.                       */
    const anyHit = Object.values(out).some(r => r.hits > 0);
    if (!Object.keys(out).length || !anyHit) continue;
    /* p0 per stodu ur SOMU gognum (sama regla og computeDefcon).      */
    const pool = {};
    for (const r of Object.values(out)) {
      const q = pool[r.pos] || (pool[r.pos] = { hits: 0, starts: 0 });
      q.hits += r.hits; q.starts += r.starts;
    }
    for (const r of Object.values(out)) {
      const q = pool[r.pos];
      const p0 = q && q.starts >= 50 ? q.hits / q.starts
                                     : (DC_P0_FALLBACK[r.pos] ?? 0.17);
      r.p0 = +p0.toFixed(3);
      r.hit_rate = +(r.hits / r.starts).toFixed(3);
      r.hit_rate_adj = +((r.hits + DC_K * p0) / (r.starts + DC_K)).toFixed(3);
    }
    seasons[d.label || m[1]] = out;
    files++;
  }
  await writeJSON("defcon_history.json", {
    updated: status.updated, seasons,
    note: "DefCon hit rate per season, DERIVED from player_gw_{s}.json (`dc` = FPL "
        + "defensive_contribution, A COUNT). Keyed on FPL `code`. ONLY "
        + "seasons that HAVE dc — DefCon is a new scoring rule from 2025/26; older "
        + "seasons are missing and must show as MISSING, not 0. Same "
        + "thresholds and shrinkage as defcon.json (DEF 10, MID/FWD 12, K=10).",
  });
  record("defcon_history", true, files,
    `${files} seasons: ${Object.entries(seasons).map(([k, v]) => `${k} (${Object.keys(v).length} players)`).join(", ") || "none"}`);
}

async function computeDefcon(events, els) {
  // þröskuldar: DEF 10 CBIT, MID/FWD 12 CBIRT. Hámark 2 stig/leik.
  // element_type: 1 GK, 2 DEF, 3 MID, 4 FWD
  const finished = events.filter(ev => ev.finished).map(ev => ev.id);
  const agg = {}; // id -> { starts, hits, cbit, cbirt }
  const posOf = {}; els.forEach(e => posOf[e.id] = e.element_type);

  for (const gw of finished) {
    const path = `${DATA}/live/gw${gw}.json`;
    if (!existsSync(path)) continue;
    let live;
    try { live = JSON.parse(await readFile(path, "utf8")); } catch { continue; }
    for (const el of (live.elements || [])) {
      const id = el.id;
      const st = el.stats || {};
      const minutes = st.minutes || 0;
      if (minutes <= 0) continue;
      const pos = posOf[id];
      /* MARKMENN ERU UTAN DEFCON — OG HER VAR ThAD VIRK TIMASPRENGJA.
         Sogulegi smiðurinn skrifadi theim `hit_rate: 0` (slaemt en satt).
         ThESSI reiknar maelikvardann SJALFUR og sendi markmenn i
         `cbirt`-greinina, sem hja theim er drifin af ENDURHEIMTUM — ad
         gripa boltann (Roefs 333, Raya 304 a timabilinu). Hermt a
         raunverulegum 2025/26-gognum med NAKVAEMLEGA thessari formulu:
         **211 af 757 markmanna-umferdum (27,9%)** na throskuldinum
         (Pope 48%, Roefs 46%, Darlow 43%). `defcon.json.players` er tom i
         forleik, svo ekkert sast — thetta hefdi byrjad ad birtast VID
         FYRSTU UMFERD sem stig-hittni fyrir stig sem markmenn geta ekki
         unnid. Maelt: 757 umferdir, 0 DefCon-stig, hamark 0.
         Throskuldarnir tveir voru lika osammala um markmenn (`POS_THRESH.GK
         = 10` en `pos === 2 ? 10 : 12` gaf theim 12) — merki um ad
         GK-tilfellid hefdi aldrei verid akvedid. Utilokun leysir hvort
         tveggja.                                                        */
      /* ADEINS ThEKKTAR UTILEIKMANNA-STODUR — `pos === 1` EITT DUGDI EKKI.
         `pos` kemur ur `posOf[id]`, sem er byggt ur bootstrap-`els`. Element
         sem er i `live/gw*.json` en VANTAR i bootstrap fær `pos === undefined`,
         slapp gegnum GK-utilokunina, var skorad a `cbirt`-greininni (sömu
         endurheimta-braut og markmenn) og skrifadist med `position: undefined`
         — GK-gatid opid aftur um bakdyrnar, og allir slikir i sama `p0`-potti.
         Nu verdur stadan ad vera ThEKKT utileikmanna-stada.              */
      if (pos !== 2 && pos !== 3 && pos !== 4) continue;
      /* BYRJANIR, EKKI INNKOMUR — sama leidretting og i sogulega smiðnum.
         `live/gw*.json` ber `starts` beint; an thess taldist hver innkoma
         af bekknum sem tapad taekifaeri og hittnin maeldist ~40% of lag.
         HLIDID VERDUR AD KOMA A UNDAN `agg[id]`-smiðinni: fyrsta utgafa
         min bjo til rodina fyrst og hljop svo `continue`, svo leikmadur
         sem BYRJADI ALDREI sat eftir med `starts: 0` og `hit_rate: 0` —
         tilbuin nulltala, nakvaemlega villan sem verid var ad laga.
         Profid (kafli 6) fann thad.                                     */
      if ((st.starts ?? 0) <= 0) continue;
      const a = agg[id] || (agg[id] = { starts:0, hits:0, cbit:0, cbirt:0, mins:0 });
      a.starts++; a.mins += minutes;
      // ÓSTAÐFEST: notum defensive_contribution stigin úr explain sem sanngildi ef til,
      // annars reiknum úr cbi+tackles(+recoveries). Loggum fyrsta þekkta manninn til að staðfesta.
      const cbi = st.clearances_blocks_interceptions ?? 0;
      const tk  = st.tackles ?? 0;
      const rec = st.recoveries ?? 0;
      const cbit = cbi + tk;
      const cbirt = cbi + tk + rec;
      a.cbit += cbit; a.cbirt += cbirt;
      /* pos: 2=DEF, 3=MID, 4=FWD (1=GK er utilokad ofar). Athugasemdin hér
         sagdi adur "GK teljum sem DEF-lik" en `pos === 2` er DEF EIN, svo
         markmenn fengu 12 — hun lysti hinu gagnstaeda vid kodann.       */
      const threshold = pos === 2 ? 10 : 12; // DEF vs MID/FWD
      const metric = pos === 2 ? cbit : cbirt;
      // staðfesta má gegn 'defensive_contribution' stigum í explain
      if (metric >= threshold) a.hits++;
    }
  }
  const out = Object.entries(agg).map(([id, a]) => ({
    fpl_id: Number(id), position: posOf[id], starts: a.starts, threshold_hits: a.hits,
    hit_rate: a.starts ? +(a.hits / a.starts).toFixed(3) : 0,
    /* "_per_90" VAR PER BYRJUN, EKKI PER 90 (lagad 17.8.2026).
       Reiknad var `total / starts`, sem er medaltal PER LEIK — talan var
       thvi haerri hja theim sem spila 90 minutur en hja theim sem er
       skipt af eftir 60, thott hun heiti per 90. Nafn sem lysir annarri
       einingu en talan er sama aett og "starts" sem taldi innkomur.
       Minutur eru nu lagdar saman (`a.mins`) og deilt med theim.       */
    cbit_per_90: a.mins ? +(a.cbit / a.mins * 90).toFixed(2) : null,
    cbirt_per_90: a.mins ? +(a.cbirt / a.mins * 90).toFixed(2) : null,
  }));

  /* ---- AFTURVIRKJUD HITTNI (hit_rate_adj) — TERMINAL_HANDOFF_4 §2 ----
     Hra hittni ofmaelist a litlum synum: okkar GW20+ maelingar (n=10-15)
     foru upp i 75-80% medan ytra vidmid (FFS-timabilsspa, ~470 leikmenn)
     hefur ENGAN leikmann yfir ~57%. Fravikin voru staerst thar sem synid
     var litid OG hittnin ha; thar sem synid var stort vorum vid innan
     8 prosentustiga — klassisk ofmaeling a litlum synum.
     Logun: empirisk Bayes-afturvirkni ad sama formi og prevWeight,
       hittni_adj = (hits + K*p0) / (starts + K),  K = 10
     p0 = STODU-meðaltal ur somu gognum (heildar-hits/heildar-starts per
     stodu), med fostum vara-gildum medan laugin er litil (fyrstu umferdir).
     Dæmi ur handoffinu: 9/12 hratt = 75% -> (9+10*0,32)/22 = 56%.
     HRAA TALAN OG n HALDA SER — afturvirknin er VIDBOT, ekki yfirskrift. */
  const DC_K = 10;
  const DC_P0_FALLBACK = { 2: 0.27, 3: 0.17, 4: 0.10 };   // 1=GK utilokadur, sja ofar
  const pool = {};
  for (const p of out) {
    const q = pool[p.position] || (pool[p.position] = { hits: 0, starts: 0 });
    q.hits += p.threshold_hits; q.starts += p.starts;
  }
  for (const p of out) {
    const q = pool[p.position];
    const p0 = q && q.starts >= 50 ? q.hits / q.starts
                                   : (DC_P0_FALLBACK[p.position] ?? 0.17);
    p.p0 = +p0.toFixed(3);
    p.hit_rate_adj = +((p.threshold_hits + DC_K * p0) / (p.starts + DC_K)).toFixed(3);
  }

  // ---- DefCon-TÆKIFÆRI per lið ----
  // Rök: fleiri skot/mörk á sig -> fleiri hreinsanir/blokkeringar -> fleiri CBIT.
  // Það eru EKKI bestu varnirnar sem skora DefCon, heldur þær sem hafa mest að gera.
  // Reiknað úr opinberum FPL-gögnum: xGC liðsins (sl. tímabil) + sóknarstyrkur andstæðinga
  // í komandi leikjum. Sjálfstætt frá CS% — má EKKI leggja saman (sjá SCHEMA.md).
  const teamAtt = {}, teamDef = {};
  for (const e of els) {
    const t = e.team;
    teamAtt[t] = (teamAtt[t] || 0) + parseFloat(e.expected_goal_involvements || 0);
    if (e.element_type === 1) {
      const mins = e.minutes || 0;
      if (mins > 400) {
        const per90 = parseFloat(e.expected_goals_conceded || 0) / (mins / 90);
        if (!teamDef[t] || mins > teamDef[t].mins) teamDef[t] = { xgc90: +per90.toFixed(2), mins };
      }
    }
  }
  let fixturesArr = [];
  try { fixturesArr = JSON.parse(await readFile(`${DATA}/fixtures.json`, "utf8")); } catch {}
  /* ============================================================
     VARALEIDIRNAR VORU FJARLAEGDAR — OG ThAD ER EKKI SNYRTING (20.8.2026)

     EINKENNID: `?? 1.4` (eigid xGC) og `|| 50` (sokn andstaedings) sagdi
     hvorug "vantar" heldur skiladi TOLU. Um leid og FPL nullstillir
     bootstrap-summurnar vid timabils-vendingu fara BADAR i gang hja
     OLLUM 20 klubbum samtimis, og formulan gefur
         1,4 * 22 + (50/38) * 20 = 57
     — SAMA tala hja ollum. MAELT 20.8.2026 a raunskranni: i dag 14 olik
     gildi a bilinu 53-86; med nullstilltum summum er thad EIN tala,
     57, tuttugu sinnum. Og thad stendur i ~5 umferdir, thvi
     markvardar-hlidid (`minutes > 400`) er onaeðanlegt fyrr en tha.

     ThETTA ER NAKVAEMLEGA VERSTA UTKOMAN SKV. CLAUDE.md KAFLA 3: talan
     birtist a 0-100 kvarda a hverju spjaldi (`DC57`), i Compare og i
     Teams, hun er ROMG OG TRUVERDUG, og ekkert i vidmotinu segir ad hun
     se agiskun. Kafli 8: "Omaeld tala faer ekki reit" og "tomt gildi er
     SLEPPT, ekki sett i 0".

     RODIN ER SAMT SKRIFUD, MED `null` I GILDUNUM — HUN MA EKKI HORFA.
     `App.jsx` (linur ~1064-1085) ber SITT EIGID afrit af thessari
     formulu og keyrir thad THEGAR `Object.keys(defcon.opportunity)` er
     TOMT. Ad sleppa rodunum hefdi thvi ekki fjarlaegt fabrikkeringuna,
     adeins flutt hana inn i appid — thar sem sama `?? 1.4` og sama
     `?? 1.4` fyrir sokn bida. Med 20 rodum (gildin null) tekur appid
     pipeline-tofluna, `num()` les null, og holfin standa tom.

     BADIR LIDIR VERDA AD VERA RAUNVERULEGIR. Halfur utreikningur (raunverulegt
     xGC + agiskud sokn) er sama villan i minni staerd, svo `raw` er null
     nema hvor tveggja liggi fyrir. Og opponent-summan verdur ad vera
     JAKVAED: `teamAtt[opp]` er 0 — ekki undefined — eftir nullstillingu,
     svo `|| 50` var einmitt thad sem grein 0 tok.
     ============================================================ */
  const opportunity = {};
  for (const tid of Object.keys(teamAtt)) {
    const own = teamDef[tid] ? teamDef[tid].xgc90 : null;
    const upcoming = fixturesArr.filter(f => !f.finished && (f.team_h === +tid || f.team_a === +tid)).slice(0, 6);
    const oppAtt = [];
    for (const f of upcoming) {
      const opp = f.team_h === +tid ? f.team_a : f.team_h;
      const s = teamAtt[opp];
      if (Number.isFinite(s) && s > 0) oppAtt.push(s / 38);   // sóknar-xGI andstæðings per leik
    }
    /* Hver leikur i glugganum verdur ad hafa andstaeding med raunverulega
       sokn — annars er medaltalid tekid yfir hluta gluggans og ber samt
       merkimidann "naestu 6".                                            */
    const oppAttAvg = (upcoming.length && oppAtt.length === upcoming.length)
      ? oppAtt.reduce((a, b) => a + b, 0) / oppAtt.length : null;
    // 0-100 kvarði: hærra = meira að gera fyrir varnarmenn = fleiri DefCon-tækifæri
    const raw = (own != null && oppAttAvg != null) ? own * 22 + oppAttAvg * 20 : null;
    opportunity[tid] = {
      own_xgc90: own,
      opp_attack_avg: oppAttAvg == null ? null : +oppAttAvg.toFixed(2),
      defcon_opportunity: raw == null ? null : Math.max(0, Math.min(100, Math.round(raw))),
      fixtures_used: upcoming.length,
    };
  }

  /* TALAN I `record` VERDUR AD VERA FJOLDI RADA MED TOLU, EKKI FJOLDI RADA.
     Radirnar eru alltaf 20 (sja skyringuna vid `opportunity` ad ofan) en
     gildid er null thegar inntokin vantar. "20 teams with a rating" um
     tuttugu tomar radir er sama tegund af logn sem varaleidirnar voru.  */
  const rated = Object.values(opportunity).filter(o => o.defcon_opportunity != null).length;

  /* TOM KEYRSLA MA ALDREI ThURRKA UT GODA SKRA (18.8.2026, kafli 8e).
     `out` verdur TOMT hvenaer sem enginn element ber jakvaett `starts` —
     t.d. ef `starts` vantar i live-svarinu, ef allir utileikmenn komu af
     bekknum, eda ef adeins markmenn eru i skranni. Adur skrifadist skrain
     samt og `record(..., true, 0)` sagdi ad allt vaeri i lagi, svo ein
     snids-breyting hja FPL hefdi eytt DefCon-sogunni bak vid graent ljos.
     Fordaemid er `fetch-bsd-teams.mjs`, sem deyr fremur en ad skrifa tomt
     timabil. Her er thad maetara: vid höldum GOMLU skranni og skraum RAUTT.
     Fyrsta keyrsla (engin skra til) ma skrifa tomt — thad er upphafsstadan,
     ekki tap, og forleikur er einmitt sa stadur.                        */
  if (!out.length) {
    let had = 0;
    try { had = (JSON.parse(await readFile(`${DATA}/defcon.json`, "utf8")).players || []).length; }
    catch { had = 0; }
    if (had > 0) {
      /* NOTAN VERDUR AD NEFNA `opportunity` LIKA (20.8.2026). Vordurinn
         frystir HEILA skrana, og `opportunity` er byggd a UNDAN honum ur
         lids-tolum sem eru ekki hadar `starts` — hun getur thvi verid
         FERSK og RETT og er samt hent. Ad segja adeins "kept the old file"
         gefur ranga mynd af thvi hvad tapadist.
         VID SAMEINUM EKKI (mælt val, ekki leti): thad myndi skrifa GOMLU
         leikmanna-rodina med `updated` DAGSINS I DAG, svo frosin tafla
         fengi ferskan timastimpil — nakvaemlega tegundin af tolu sem er
         alltaf rong en trudverdug. Frysting BADRA er samhljoda skra;
         sameining er tvaer aldir i einni skra sem segist vera ein.     */
      record("defcon", false, had,
        `0 rows built but ${had} are on disk - KEPT the old file, INCLUDING its opportunity table `
        + `(this run's fresh opportunity ratings for ${rated} of ${Object.keys(opportunity).length} teams were `
        + `discarded too - merging them would stamp the frozen player rows with today's date)`);
      return;
    }
  }
  await writeJSON("defcon.json", { updated: status.updated, players: out, opportunity,
    note: "hit_rate = threshold_hits/starts (RAW — overstates on small samples). hit_rate_adj = (hits + 10*p0)/(starts + 10), p0 = positional mean — USE THAT ONE for display, always with starts beside it. DEF threshold 10 CBIT, MID/FWD 12 CBIRT. defcon_opportunity: defensive workload (higher = more CBIT chances) — a SEPARATE measure from CS%, do not add them together. IT IS null, NEVER A SUBSTITUTED CONSTANT, when the inputs are missing: a team needs a keeper past 400 minutes for its own xGC and every opponent in the six-fixture window needs a positive xGI sum. Both sides of the sum must be real, so an empty column early in a season means \"not measurable yet\", not \"average\"." });
  record("defcon", true, out.length,
    `${rated} of ${Object.keys(opportunity).length} teams with an opportunity rating`
    + `${rated ? "" : " - bootstrap season totals are still zero, so every rating is null (correct: the old code substituted 1.4/50 and gave all 20 clubs the same 57)"}`);
}

/* ========== 3b. PER-UMFERÐAR LEIKMANNASAGA — mínútuþróun ==========
   ENGIN NÝ KÖLL: leitt úr data/live/gw{n}.json sem pipeline skrifar þegar
   fyrir hverja lokna umferð. Árstölur (`minutes/gamesPlayed`) geta ekki
   greint sess sem VEX frá sessi sem RÝRNAR — þetta getur.

   Raðirnar eru PER UMFERÐ, ekki per leikinn leik: sá sem sat á bekknum
   fær 0 og telur með. (Fyrri mæling sem sleppti 0-röðum lét bekkjarmenn
   virðast í formi — sjá tests/rank-model.mjs.)                          */
async function computePlayerForm(events, els) {
  const finished = events.filter(ev => ev.finished).map(ev => ev.id).sort((a, b) => a - b);
  const hist = {};                        // id -> [{gw, mins, pts, starts}]
  els.forEach(e => hist[e.id] = []);

  for (const gw of finished) {
    const path = `${DATA}/live/gw${gw}.json`;
    if (!existsSync(path)) continue;
    let live;
    try { live = JSON.parse(await readFile(path, "utf8")); } catch { continue; }
    for (const el of (live.elements || [])) {
      if (!hist[el.id]) hist[el.id] = [];
      const st = el.stats || {};
      hist[el.id].push({ gw, mins: st.minutes || 0, pts: st.total_points || 0,
                         starts: st.starts || 0 });
    }
  }

  const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
  const out = {};
  let withTrend = 0;
  for (const [id, rows] of Object.entries(hist)) {
    if (!rows.length) continue;
    rows.sort((a, b) => a.gw - b.gw);
    const l5 = rows.slice(-5);
    const m5 = l5.map(r => r.mins);
    /* þróun: síðustu 2 umferðir MÍNUS þær 3 þar á undan. Þarf >=4 raðir,
       annars er "þar á undan" sama gluggi og "síðustu" og talan er 0.   */
    const recent = mean(m5.slice(-2));
    const before = l5.length >= 4 ? mean(m5.slice(0, -2)) : recent;
    const trend = recent - before;
    if (trend !== 0) withTrend++;
    out[id] = {
      gws: rows.length,
      mins5: +mean(m5).toFixed(1),
      mins_trend: +trend.toFixed(1),
      ppg5: +mean(l5.map(r => r.pts)).toFixed(2),
      start_rate5: +mean(l5.map(r => r.starts >= 1 ? 1 : 0)).toFixed(2),
    };
  }

  await writeJSON("player_form.json", {
    updated: status.updated, gws_used: finished.length, players: out,
    note: "Per-gameweek history derived from data/live/gw{n}.json — NO new calls. "
        + "mins_trend = minutes/gameweek over the last 2 minus the three before them (rows per GAMEWEEK, 0 counted). "
        + "Used in rankScore (weight 0.01; measured +0.066 on the top 15, 5/5 seasons). "
        + "Empty before GW4 — until then trend is 0 and the score is unchanged.",
  });
  record("player_form", true, Object.keys(out).length,
    finished.length ? `${finished.length} gameweeks, ${withTrend} with a minutes trend`
                    : "no finished gameweek (preseason) — the trend switches on at GW4");
}

/* ========== 3c. STADFEST BYRJUNARLID — /fixtures/lineups ==========
   VERDMAETASTA VIDBOTIN skv. CLAUDE.md kafla 7.1: lidin birtast 40-60 min
   fyrir leik. Med fetch-fast (30 min) naest thvi "byrjar EKKI"-flagg a mina
   menn adur en seinni leikir dagsins byrja — thad er dyrasta einstaka
   mistokin i FPL ad stilla upp manni sem endar a bekknum.

   TVO KOLL PER LEIKDAG-LOTU, EKKI EITT:
   FPL-fixture-id og API-Sports-fixture-id eru ONNUR NUMER. Thvi tharf
   /fixtures?league=39&date=... fyrst (1 kall) til ad fa their id og para
   thau vid FPL-leikina eftir LIDUM, og svo /fixtures/lineups per leik.
   ~11 koll a leikdegi af 100/dag.

   HEIMILDIN A FRIA THREPINU ER OSTADFEST — OG THAD ER MAELT, EKKI GISKAD:
   hvorki notandinn ne eg getum profad hana staðbundid thvi lykillinn er
   adeins i GitHub Secrets (`curl` an hans skilar
   {"errors":{"token":"Missing application key"}} — profad 31.7.).
   Thess vegna er RANNSAKANDI KALL innbyggt: se enginn leikur i glugganum
   er gert EITT kall a thekkt fixture-id og `errors` LOGGAD OSKERT. Actions-
   keyrslan hefur lykilinn, svo logid svarar spurningunni i naestu keyrslu.
   Svarid fer lika i status.json, svo thad se ekki bundid vid eitt log.

   ENGIN AGISKUN UM SVARSNIDID: umslagid ({get,errors,results,response})
   er STADFEST gegn lifandi hostinum, og er thad sama sem fetchInjuries
   les thegar. Innihald `response[]` er skjalfest v3-snid:
     [{ team:{id,name}, formation:"4-3-3", startXI:[{player:{id,name,pos}}],
        substitutes:[{player:{...}}] }]
   Se snidid annad fellur EKKERT — vid skrifum tha 0 leikmenn og skraum thad. */
async function fetchLineups() {
  const errTxt = o => (o.errors && (Array.isArray(o.errors) ? o.errors.join("; ")
                                    : JSON.stringify(o.errors))) || "";
  /* GLUGGINN: leikir sem eru ad byrja (innan 2 klst) eda nybyrjadir (3 klst).
     Utan hans er ekkert ad hafa og engin koll eru notud.                  */
  let fx = [];
  try {
    const all = JSON.parse(await readFile(`${DATA}/fixtures.json`, "utf8"));
    const now = Date.now();
    fx = all.filter(f => f.kickoff_time && !f.finished_provisional && !f.finished)
      .filter(f => { const d = new Date(f.kickoff_time).getTime() - now;
                     return d < 2 * 3600e3 && d > -3 * 3600e3; });
  } catch (e) { record("api_lineups", false, 0, `fixtures.json: ${e.message}`); return; }

  if (!fx.length) {
    /* RANNSAKANDI KALL — svarar AÐEINS "leyfir threpid endapunktinn?"
       OG ThAD ER SPURNING SEM ThARF AD SVARA EINU SINNI, EKKI 48x A DAG.
       VILLA SEM EG SETTI INN 31.7. OG MAELDI 2.8.: kallid var gert i HVERRI
       hradri keyrslu. Cron gengur a 30 min fresti, svo 48 keyrslur a dag = 48 koll a dag af
       100 i fria threpinu — helmingur dagskvotans i greiningu sem var thegar
       svarad (31.7.: http=200, errors=[], threp LEYFIR endapunktinn).
       2.8. skiladi hun {"access":"Your account is suspended"}. Eg get ekki
       fullyrt ad kollin min hafi valdid thvi — uppsogn er venjulega
       reikningsatridi — en ad brenna helming kvotans i vordur er villa
       oháð thvi.
       NU: svarid er GEYMT i lineups.json og endurtekid adeins ef thad er
       eldra en PROBE_TTL_DAYS. Vid leikdag er thetta hvort sem er ekki
       notad — tha eru raunveruleg kall gerd.                             */
/* OSAMHVERF GEYMSLA — LAGAD 4.8.2026. Fyrsta utgafan geymdi SVARID i 7
       daga oháð thvi HVERT thad var, og thad hafdi afleidingu sem eg sa ekki
       fyrr en reikningurinn var lagfaerdur: geymda svarid var UPPSOGN, svo
       pipeline hefdi EKKI tekid eftir ad adgangur var kominn aftur i allt ad
       viku. Geymsla sem thaggar nidur GODAR frettir er ekki geymsla, hun er
       hindrun.
       Rett regla: HEILBRIGT svar ma geyma lengi (thad breytist ekki), en
       BLOKKERAD svar er stod sem er VAENTANLEGA timabundin og a ad reyna
       aftur fljott. 7 dagar a moti 1 degi.                                */
    const PROBE_TTL_OK = 7, PROBE_TTL_BLOCKED = 1;
    let prev = null;
    try { prev = JSON.parse(await readFile(`${DATA}/lineups.json`, "utf8")).probe; } catch {}
    const prevAge = prev?.at ? (Date.now() - Date.parse(prev.at)) / 864e5 : Infinity;
    const PROBE_TTL_DAYS = prev?.gated ? PROBE_TTL_BLOCKED : PROBE_TTL_OK;
    if (prev && prevAge < PROBE_TTL_DAYS) {
      await writeJSON("lineups.json", { updated: status.updated, gws: [], teams: [],
        players: [], probe: prev,
        note: "Confirmed line-ups from API-Sports /fixtures/lineups. EMPTY outside "
            + "the matchday window. `probe` is a STORED response (repeated every "
            + `${PROBE_TTL_DAYS} days) — not a fresh call on every run.` });
      record("api_lineups", true, 0,
        `no match in window; stored response is ${prevAge.toFixed(1)} days old`
        + (prev.gated ? " — ENDPOINT CLOSED" : ""));
      return;
    }
    const probe = await apiSports("/fixtures/lineups?fixture=1035037");
    const err = errTxt(probe);
    console.log(`API-Sports /fixtures/lineups RANNSOKN: http=${probe.http} ` +
                `results=${probe.results} errors=${JSON.stringify(probe.errors ?? null)}`);
    /* SNIDID LOGGAD LIKA. Rannsoknin 31.7. gaf http=200, errors=[] og
       results=2 — th.e. threpid LEYFIR endapunktinn. Tha er naesta spurning
       hvort `response[]` se i thvi sniði sem vid lesum, og thad er odyrt ad
       svara: logga lyklana i stad thess ad treysta skjolun.              */
    const first = (probe.response || [])[0];
    if (first) console.log("  SNID response[0]: lyklar=" + JSON.stringify(Object.keys(first))
      + ` team=${JSON.stringify(first.team?.name ?? null)}`
      + ` formation=${JSON.stringify(first.formation ?? null)}`
      + ` startXI=${Array.isArray(first.startXI) ? first.startXI.length : "MISSING"}`
      + ` substitutes=${Array.isArray(first.substitutes) ? first.substitutes.length : "MISSING"}`
      + ` player0=${JSON.stringify(first.startXI?.[0]?.player ?? null)}`);
    /* "suspended" VANTADI HER og thad kostadi ranga stodu: 2.8.2026 var
       reikningurinn UPPSAGDUR ("Your account is suspended") en `gated` vard
       false, svo stodan sagdi "endapunktur svarar an plan-villu" — sem er
       ordrett rett og alvarlega misvisandi. Adgangsleysi er adgangsleysi
       hvort sem thad heitir plan, threp eda uppsogn.                     */
    const gated = /plan|subscription|not allowed|upgrade|suspend|access/i.test(err);
    record("api_lineups", true, 0,
      gated ? `ENDPOINT CLOSED on the free tier: ${err.slice(0, 120)}`
            : err ? `no match in window; the probe returned: ${err.slice(0, 120)}`
                  : "no match in window (waiting for a matchday) — endpoint answers without a plan error");
    await writeJSON("lineups.json", { updated: status.updated, gws: [], teams: [], players: [],
      probe: { at: status.updated, http: probe.http, errors: probe.errors ?? null, gated },
      note: "Confirmed line-ups from API-Sports /fixtures/lineups. EMPTY outside "
          + "the matchday window (a match within 2h or just started). `probe` "
          + "stores the answer to whether the free tier allows the endpoint." });
    return;
  }

  /* 1. API-fixture-id per dagsetning, parad vid FPL-leiki eftir lidum.
     Nafna-visirinn er sameiginlegur — sja `apiNameIndex`.               */
  const { teamIdOf, unresolvedTeams, aliasCollisions, matchFpl } = await apiNameIndex();

  /* Dagsetningar-kall er ekki gert se ALLT thegar til — annars kostadi hver
     keyrsla 1 kall til einskis medan glugginn er opinn.                   */
  let prevPeek = null;
  try { prevPeek = JSON.parse(await readFile(`${DATA}/lineups.json`, "utf8")); } catch {}
  const havePeek = new Set((prevPeek?.players || []).map(x => x.fixture));
  const missing = fx.filter(f => !havePeek.has(f.id));
  const dates = [...new Set(missing.map(f => f.kickoff_time.slice(0, 10)))];
  const apiFx = [];
  let calls = 0, errs = [];
  for (const dt of dates) {
    const r = await apiSports(`/fixtures?league=39&date=${dt}`); calls++;
    if (errTxt(r)) errs.push(`fixtures ${dt}: ${errTxt(r)}`);
    for (const it of (r.response || [])) {
      const h = teamIdOf(it.teams?.home?.name);
      const a = teamIdOf(it.teams?.away?.name);
      if (it.fixture?.id && h && a) apiFx.push({ apiId: it.fixture.id, h, a });
    }
  }
  /* 2. Lineups per leik sem vid getum parad vid FPL-leik */
  /* GEYMSLA PER LEIK: byrjunarlid breytist ekki eftir ad thad er birt, en
     glugginn er opinn i 5 klst og keyrslan gengur a 30 min fresti — an
     thessa voru SOMU lidin sott allt ad 10 sinnum. Vid berum afram thad sem
     vid hofum thegar og spyrjum adeins um leiki sem vantar.               */
  let prevAll = null;
  try { prevAll = JSON.parse(await readFile(`${DATA}/lineups.json`, "utf8")); } catch {}
  const haveFx = new Set((prevAll?.players || []).map(x => x.fixture));
  const outPlayers = [], outTeams = [], unmatched = [];
  let reused = 0;
  for (const f of fx) {
    if (haveFx.has(f.id)) {
      outPlayers.push(...(prevAll.players || []).filter(x => x.fixture === f.id));
      outTeams.push(...(prevAll.teams || []).filter(x => x.fixture === f.id));
      reused++;
      continue;
    }
    const m = apiFx.find(x => (x.h === f.team_h && x.a === f.team_a));
    if (!m) continue;
    const r = await apiSports(`/fixtures/lineups?fixture=${m.apiId}`); calls++;
    if (errTxt(r)) { errs.push(`lineups ${m.apiId}: ${errTxt(r)}`); continue; }
    for (const side of (r.response || [])) {
      const teamId = teamIdOf(side.team?.name);
      /* OLEYST LID VAR SLEPPT ThEGJANDI OG ThAD KOSTADI HEILT BYRJUNARLID
         (21.8.2026, sja hausinn a `apiNameIndex`). "Manchester United" og
         "Nottingham Forest" leystust ekki, svo GW1-leikir theirra hefdu skilad
         ENGU — og hvorki `unmatched` ne `errors` badu talid thad, thvi thetta
         `continue` er FYRIR porunina. Nu er thad SKRAD.                    */
      if (!teamId) { errs.push(`club name unresolved: "${side.team?.name}"`); continue; }
      outTeams.push({ fpl_team: teamId, gw: f.event, formation: side.formation ?? null,
                      fixture: f.id });
      const add = (arr, started) => {
        for (const e of (arr || [])) {
          const nm = e.player?.name;
          const id = matchFpl(nm, teamId);
          if (id == null) { unmatched.push(`${nm} (${side.team?.name})`); continue; }
          outPlayers.push({ fpl_id: id, fpl_team: teamId, gw: f.event, fixture: f.id,
                            started, pos: e.player?.pos ?? null, name_api: nm });
        }
      };
      add(side.startXI, true);
      add(side.substitutes, false);
    }
  }
  await writeJSON("lineups.json", { updated: status.updated,
    gws: [...new Set(fx.map(f => f.event))], calls,
    teams: outTeams, players: outPlayers, unmatched, errors: errs,
    unresolved_teams: [...unresolvedTeams], alias_collisions: aliasCollisions,
    note: "Confirmed starters (started=true) and bench (false) from API-Sports "
        + "/fixtures/lineups for matches inside the window. FPL status still governs "
        + "availability; this is CONFIRMATION, not a forecast. `unresolved_teams` lists "
        + "club names this source sent that no club-name variant matched — an empty list "
        + "is the only correct value; anything in it means whole line-ups were dropped." });
  const started = outPlayers.filter(p => p.started).length;
  record("api_lineups", !errs.length || !!outPlayers.length, outPlayers.length,
    errs.length ? `${calls} calls (${reused} reused), ${started} starting, errors: ${errs[0].slice(0, 90)}`
                : `${calls} calls (${reused} matches reused), ${outTeams.length} clubs, `
                  + `${started} starting, ${unmatched.length} unmatched`
                  + (unresolvedTeams.size ? ` — CLUB NAMES UNRESOLVED: ${[...unresolvedTeams].join(", ")}` : ""));
}

/* ========== 4. CLUB ELO — CSV, tvö köll (http + endurtekning v. yfirálags) ========== */
async function eloFetch(url, tries = 6) {
  let lastErr;
  /* HVER TILRAUN ER SKRAD, EKKI ADEINS SU SIDASTA (18.8.2026).
     Stadan sagdi eitt ord — "The operation was aborted due to timeout" —
     og thad ord greinir EKKI a milli throttlunar (allar tilraunir falla a
     timamorkum) og bilads thjons (429/5xx) eda snids-breytingar (tom svor).
     Notandinn stadfesti sjalfur ad ClubElo VAERI UPPI medan stadan sagdi
     "timeout", og an munstursins var ekkert haegt ad alykta. Nu ber notan
     hve margar tilraunir voru gerdar, yfir hve langan tima, og HVERNIG
     hver theirra fell — thad adgreinir throttlun fra ollu odru.        */
  const log = [];
  const t0 = Date.now();
  for (let i = 0; i < tries; i++) {
    try {
      /* TIMAMORK — VANTADI ALVEG. undici hefur ~300 s sjalfgildi, sem er
         ekki timamork i cron heldur HENGJA: thrjar tilraunir gefa 15 min af
         bid adur en keyrslan gefst upp. Maelt 31.7.2026: elo BRAST i raun
         thann dag ("fetch failed") og appid keyrdi FFDR a Elo fra 30.7. an
         ad nokkud saegdi thad — sama mynstur sem gerdi markadslidinn daudan
         i viku (kafli 3). 20 s er rifleg mork fyrir eina CSV.            */
      const r = await fetch(url, { headers: { "User-Agent": UA },
                                   signal: AbortSignal.timeout(20000) });
      if (r.status === 429 || r.status >= 500) throw new Error(`${r.status} (overload?)`);
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      const text = await r.text();
      if (!text || text.length < 20) throw new Error("empty response");
      return text;
    } catch (e) {
      lastErr = e;
      /* 48 STAFIR, EKKI 34: "The operation was aborted due to timeout" er 40
         stafir og 34 klippti burt ordid TIMEOUT — thad eina sem adgreinir
         throttlun fra ollu odru. Profid fann thad.                      */
      log.push(`#${i + 1} ${String(e.message).slice(0, 48)}`);
      console.warn(`ClubElo attempt ${i + 1}/${tries} failed: ${e.message}`);
      /* ekki sofa eftir SIDUSTU tilraun — thad voru 6 s af hreinni bid.
         BIDIN LENGD 9.8.2026: hun var 2 s + 4 s = 6 s alls, sem er of
         stutt fyrir thad sem raunverulega gerist. Maelt: ClubElo svarar
         HEDAN a 0,8-1,7 s en keyrslan i Actions fell a "aborted due to
         timeout" og elo.json var 4 daga gamalt — svarid er IP-throttlun a
         sameiginlegum CI-tolum, ekki haegur thjonn. Throttlun mælist i
         tugum sekunda, svo 5 s / 20 s / 45 s gefur ~70 s af dreifdri bid
         i stad 6. Verstu mork eru enn undir minutu og hálfri.
         ATH: `http`, EKKI `https` — https hengur (maelt: 40 s an svars).
         Ekki "uppfaera" thad.                                           */
      /* BIDIN LENGD AFTUR 18.8.2026. Hun for i 5/20/45 s thann 9.8. og
         elo BRAST SAMT a hverri einustu keyrslu fra ~14.8. — fjorir dagar
         thar sem FFDR keyrdi a frosnu Elo. Throttlun sem hverfur ekki a
         70 s tharf lengri dreifingu, og thetta fall keyrir EINGONGU i
         daglegu keyrslunni (`fetchFast` snertir hana ekki), svo timinn er
         til. Versta tilfelli er nu ~6,5 min i stad ~1,5.                */
      if (i < tries - 1) await new Promise(r => setTimeout(r, [5000, 20000, 45000, 90000, 120000][i] ?? 120000));
    }
  }
  /* SKILABODIN BERA MUNSTRID, EKKI SIDASTA ORDID. "allar 6 a timamorkum
     yfir 280 s" les eins og throttlun; "1x 429" eda "1x 404" les eins og
     eitthvad allt annad — og thad er munurinn sem vantadi.              */
  const secs = Math.round((Date.now() - t0) / 1000);
  /* ThAKID VAR 150 STAFIR OG ThAD KLIPPTI BURT ThAD SEM ThAD ATTI AD SYNA
     (19.8.2026). Sex tilraunir a ~48 stofum rumast ekki i 150, svo keyrsla
     sem BLANDAR throttlun, 429 og tomu svari las eins og hrein throttlun —
     lifandi stada endadi bokstaflega a "#4 The opera". Munstrid er allt
     gagnid i thessari linu; ef eitthvad tharf ad vikja er thad lengdin.
     Endurteknar EINS bilanir eru thjappadar ("4x timeout") svo lengdin
     vaxi ekki med fjolda tilrauna.                                      */
  const tally = new Map();
  for (const L of log) {
    const kind = String(L).replace(/^#\d+\s*/, "").slice(0, 40);
    tally.set(kind, (tally.get(kind) || 0) + 1);
  }
  const summary = [...tally].map(([k, n]) => (n > 1 ? `${n}x ${k}` : k)).join(" | ");
  const err = new Error(`${tries} attempts over ${secs}s all failed: ${summary.slice(0, 330)}`);
  err.cause = lastErr;
  throw err;
}
async function fetchElo() {
  /* TVEIR HOSTAR, EKKI EINN — OG BARA ANNAR ER UPPI (20.8.2026).
     `elo.json` var frosin fra 14.8. og stadan sagdi "6 attempts over 400s
     all failed: 6x ... aborted due to timeout". Notandinn sagdi rettilega
     ad ClubElo VAERI UPPI, og hvort tveggja var satt:
       api.clubelo.com -> 37.128.134.74, 0 baet, timeout a 12 s OG 25 s,
                          bæði http og https, HEDAN og ur CI-tolum
       clubelo.com     -> 172.66.0.96 (Cloudflare), 200, ~595 KB, 0,11 s
     Sjá `parseClubEloWeb` fyrir maelingarnar a rekinu — frosin Elo er EKKI
     hlutlaus: 14.8. -> 20.8. reikadi hun ad medaltali 14,4 stig og mest
     58,8 (ARS), og RODIN breyttist (forskot ARS a MCI 92,9 -> 13).
     API-ID ER AFRAM ADALLEIDIN: hun er hreint CSV med `Rank`/`Level` og
     tharf enga thattun. Vefurinn keyrir EINGONGU eftir ad endurtilraunir
     API-sins eru bunar (~6,5 min), og hann er VALIDERADUR (sja thar).   */
  let eng = null, via = "api.clubelo.com", apiErr = null;
  try {
    // ClubElo notar http (ekki https) — https gefur oft "fetch failed"
    const text = await eloFetch(`http://api.clubelo.com/${today}`);
    const { header, rows } = parseCSV(text);
    console.log(`ClubElo dags-haus: ${header.join(",")}`);
    eng = rows.filter(r => r.Country === "ENG" && (r.Level === "1" || r.Level === "2"));
    record("elo_api", true, eng.length, `api.clubelo.com/${today} - ENG L1+L2`);
  } catch (e) {
    /* EIGIN ROD FYRIR ADALLEIDINA. Aduren fell hun i somu rod og gognin
       sjalf, svo "vefurinn bjargadi okkur" hefdi orðid GRAEN rod og
       API-bilunin — sem er raunverulegt, vidvarandi ástand — hefdi horfid
       ur stodunni alveg. Tvaer stadhaefingar, tvaer rodir.               */
    apiErr = e;
    record("elo_api", false, 0, String(e.message).slice(0, 300));
    console.warn(`ClubElo API unusable, falling back to the website: ${e.message}`);
    eng = parseClubEloWeb(await eloFetch(ELO_WEB_URL, ELO_WEB.TRIES));
    via = "clubelo.com (website fallback)";
  }
  // LOGGA öll ensk nöfn — þannig þarf aldrei að giska á stafsetningu aftur
  console.log(`ClubElo ENG names via ${via} (${eng.length}): ${eng.map(r => r.Club).join(" | ")}`);

  const byNorm = {};
  eng.forEach(r => { byNorm[clubeloNorm(r.Club)] = r; });

  const eloByFpl = {};
  const teams = [], missing = [];
  for (const [id, t] of Object.entries(teamsById)) {
    const cands = CLUBELO_CAND[t.short_name] || [t.name];
    let row = null;
    for (const c of cands) { const hit = byNorm[clubeloNorm(c)]; if (hit) { row = hit; break; } }
    if (row) {
      /* `level: +row.Level` VAR RANGT UM VARALEIDINA. Vefurinn ber ENGA
         deildar-threp sem er marktaekt (Vega-blobbid segir Brentford og
         Coventry "Level 2" thott badir seu i PL 2026/27 — sja
         `parseClubEloWeb`), svo hun sendir `null`. `+null` er 0, og
         "level 0" er omaeld tala sem les eins og maeling. NULL ER EKKI
         NULL. Ekkert i appinu les thetta svid; adalleidin er obreytt.   */
      const rec = { fpl_id: Number(id), short: t.short_name, elo: +row.Elo,
        rank: row.Rank ? +row.Rank : null,
        level: row.Level == null ? null : +row.Level, clubelo_name: row.Club };
      teams.push(rec); eloByFpl[row.Club] = Number(id);
    } else {
      missing.push(t.short_name);
      console.warn(`ClubElo: could not find ${t.short_name} (${t.name}) — tried: ${cands.join(", ")}`);
    }
  }
  /* VARALEIDIN ER ALLT-EDA-EKKERT; ADALLEIDIN ER ÓBREYTT.
     `homeCore` (0,20 fyrir DEF) kviknar EINGONGU thegar Elo var notad —
     maelt i `DIFF_W`: an Elo brotnar einraenni threpanna (8/14 a moti
     12/14). Skra thar sem 19 lid hafa Elo og eitt ekki setur thvi 38 af
     380 leikjum a ANNAN KVARDA en hina 342 — tveir kvardar i somu toflu,
     nakvaemlega sama villa sem afstaed threp innan lids voru hofnud fyrir.
     Frosin skra er a EINUM kvarda og ber aldur sinn i `elo_age`; hun er
     thvi skaarri kostur. Maelt 20.8.2026: 20/20 pöruð, svo strangleikinn
     kostar EKKERT i eðlilegu ástandi — og thegar hann fellur nefnir notan
     lidid, sem er ein lina i `CLUBELO_CAND`.                            */
  if (apiErr && missing.length > ELO_WEB.MAX_MISSING) {
    throw new Error(`website fallback matched only ${teams.length} of `
      + `${Object.keys(teamsById).length} clubs (no Elo for ${missing.join(", ")}) - `
      + `keeping the old elo.json rather than writing a file where some clubs are on a `
      + `different scale; add the name to CLUBELO_CAND. The API said: ${apiErr.message}`);
  }
  await writeJSON("elo.json", { updated: status.updated, source: via, teams });
  /* NOTAN MA ALDREI SEGJA AD API-ID HAFI VIRKAD. `ok` er samt `true`:
     skran ER fersk og validerud, og raud rod ofan a ferskri skra thjalfar
     mann i ad hunsa raudan lit. Adallidin ber sina eigin rod (`elo_api`),
     svo bilunin er skrad thar sem hun a heima.                          */
  record("elo", true, teams.length, apiErr
    ? `VIA WEBSITE FALLBACK (clubelo.com) - api.clubelo.com failed: `
      + `${String(apiErr.message).slice(0, 120)}`
    : `of ${eng.length} ENG L1+L2`);

  // /Fixtures: kolónur STAÐFESTAR = Date,Country,Home,Away,GD<-5..GD>5,R:0-0..R:6-0
  // Úr úrslitalíkindum má reikna hreint blað og sigurlíkur — ókeypis, engin Odds-credit.
  try {
    /* SAMI HOSTUR SEM VAR NYBUID AD SANNA ONAAANLEGAN — thess vegna 2
       tilraunir og ekki 6 (20.8.2026). Maelt i lifandi keyrslu: `fetchElo`
       tok 800 s, thar sem 400 s voru dagsetta CSV-id og 400 s VORU ThESSI
       LYKKJA a SAMA hostinum. Stiginn (5/20/45/90/120 s) er til vegna
       IP-throttlunar a sameiginlegum CI-tolum, og su tilgata var ThEGAR
       reynd til thrautar i thessari keyrslu — onnur eins lykkja profar
       ekkert nytt. Tvaer tilraunir taka aframhaldandi eitt-skiptis-fall.
       ATH: thetta er EKKI throskuldur a gagnagaedum heldur bid; svarid
       sjalft er profad eins og adur.                                    */
    const ft = await eloFetch("http://api.clubelo.com/Fixtures", apiErr ? 2 : 6);
    const { header: fh, rows: fr } = parseCSV(ft);
    const engFx = fr.filter(r => r.Country === "ENG");
    const scoreCols = fh.filter(h => h.startsWith("R:"));
    const out = engFx.map(r => {
      let csHome = 0, csAway = 0, pHome = 0, pDraw = 0, pAway = 0, xgH = 0, xgA = 0;
      for (const col of scoreCols) {
        const m = col.match(/^R:(\d+)-(\d+)$/); if (!m) continue;
        const h = +m[1], a = +m[2], p = parseFloat(r[col] || 0);
        if (!p) continue;
        if (a === 0) csHome += p;      // andstæðingur skorar ekki -> heimalið heldur hreinu
        if (h === 0) csAway += p;
        if (h > a) pHome += p; else if (h === a) pDraw += p; else pAway += p;
        xgH += h * p; xgA += a * p;
      }
      return {
        date: r.Date, home: r.Home, away: r.Away,
        home_fpl: eloByFpl[r.Home] ?? null, away_fpl: eloByFpl[r.Away] ?? null,
        cs_home: +(csHome * 100).toFixed(1), cs_away: +(csAway * 100).toFixed(1),
        p_home: +(pHome * 100).toFixed(1), p_draw: +(pDraw * 100).toFixed(1), p_away: +(pAway * 100).toFixed(1),
        xg_home: +xgH.toFixed(2), xg_away: +xgA.toFixed(2),
      };
    });
    await writeJSON("elo_fixtures.json", { updated: status.updated, fixtures: out });
    record("elo_fixtures", true, out.length, `${engFx.length} ENG of ${fr.length}`);
  } catch (e) { record("elo_fixtures", false, 0, e.message); }
}

/* ============================================================
   CLUBELO — VEF-VARALEIDIN  (20.8.2026)

   HVERS VEGNA HUN ER TIL: `api.clubelo.com` er ONAAANLEG fra thessari
   vel OG fra CI-tolum — 0 baet, timeout a 12 s og 25 s, bæði http og
   https, DNS 37.128.134.74. `clubelo.com` er UPPI: 200, ~595 KB, 0,11 s,
   DNS 172.66.0.96 (Cloudflare). Tveir hostar, ein bilud.

   OG FROSIN ELO ER EKKI HLUTLAUS. Skrain fra 14.8. borin vid vefinn 20.8.
   (16 lid sem badar heimildir bera): medalrek |14,4|, mest 58,8 (ARS
   2063,8 -> 2005). RODIN breyttist, og rodin er thad sem FFDR les:
   forskot ARS a MCI for ur 92,9 i 13, og TOT for upp fyrir LEE. GW1 er
   21.8. kl. 17:30 UTC.

   HVAD ER LESID — OG HVAD ER EKKI:
   · `https://clubelo.com/` ber HEILA hnattraena rodunartoflu i STODUGU
     HTML-i: <tr><td class="l">...alt="ENG"...<small>RODUN</small>...
     <span class="Ast">NAFN</span>...</td><td class="r">ELO</td></tr>.
     Maelt 20.8.2026: 643 radir, 60 sambond, 48 ensk lid, og OLL 20
     FPL-lidin — Hull er i rod 322 med 1582.
   · Nofnin i `Ast`-span eru NAKVAEMLEGA thau sömu sem CSV-ID gefur i
     `Club` ("Man City", "Forest", "Crystal Palace"), svo `CLUBELO_CAND`
     og `clubeloNorm` eru notud OBREYTT. ENGIN onnur nafna-porun er
     skrifud her — thogul rong porun er verri en engin (BSD-reglan:
     fuzzy felldi Man United inn i Man City).
   · TLC-kodinn ("MNU" fyrir Man United) er I HTML-inu og er EKKI notadur:
     hann er ekki FPL-skammstofunin og hefdi verid onnur porunar-leid.
   · `Level` er sett NULL. Vega-blobbid a sidunni segir Brentford OG
     Coventry "Level 2" thott badir seu i PL 2026/27 — talan er throska
     eda onnur staerd, og omaeld tala sem lítur ut eins og maeling er
     versta utkoman. Ekkert i appinu les svidid (grep: adeins `elo` og
     `rank`).
   · TOLURNAR ERU NAMUNDADAR I HEILAR I TOFLUNNI (CSV-id gefur fleytitolu).
     Kostnadurinn er maeldur: `eScore = (op-me)/150 + 3`, svo +/-1 Elo er
     0,0067 a 1-5 kvarda og x `W.elo`=0,15 = 0,001 a `core`. Rekid sem
     thetta lagfaerir er 58,8 Elo = 0,059 a `core` — SEXTIUFALT staerra.
   · `https://clubelo.com/<Klubbur>` (per-lid) og `/ENG` eru EKKI notadar.
     /ENG ber raunar SOMU 643 radir (maelt: eins radafjoldi og eins
     ENG-tolur) auk 25-lida blobs, svo hun VAERI nothaef — en heimasidan
     dugar med 20/20 og ein sokn er einfaldari en tvaer. Per-lid-sidur
     hefdu kallad a AD GISKA A SLUG ("realmadrid" er lagstafa, "ParisSG"
     er ekki) = onnur nafna-porun.

   ================== VALIDERINGIN ==================
   HTML getur breyst thegjandi og markmidid er ad forda TRUVERDUGRI RANGRI
   TOLU. Hver throskuldur er MAELDUR, og hver theirra tekur SITT
   bilunar-munstur — thess vegna eru their fimm og ekki einn:

   1) SVID [1300, 2200] a OLLUM 643 rodum. Maelt a 18.816 raunverulegum
      fyrir-leik PL-Elo gildum (`clubelo_history.json`, 25 timabil):
      min 1475,5, max 2090,1; p0,1% 1511, p99,9% 2074. Toflan sjalf i dag:
      1500-2019. Throskuldurinn hefur thvi ~175 stig af lofti nidur og
      ~110 upp. TEKUR: rangur dalkur (Golo 1,03, breyting +0,08, rodun
      322), klippt tala. TEKUR EKKI arid 2026 — thad er innan svidsins,
      og throskuldur stilltur til ad taka EITT falsgildi vaeri valin tala,
      ekki maeld.
   2) SPONN >= 150 stig meðal ensku lidanna. Maelt: 491 i dag; minnsta
      arstidar-sponn PL-lidanna a 25 timabilum er 353 (2016/17), staerst
      565. 150 er undir HELMINGI af theirri minnstu, svo hun getur ekki
      fallid a raungognum. TEKUR: hvert tilfelli thar sem hvert gildi
      verdur ad SOMU tolu — thar a medal "arid 2026 i hverri rod".
   3) EINKVAEM GILDI >= 60% ensku radanna. Maelt: 45 af 48 (94%). 48
      heilar tolur a 491 stiga bili gefa vaentar ~2,3 arekstra (maelt 3),
      svo 60% (>= 29 af 48) leyfir 19 — attafalt meira en vaent. TEKUR:
      hlutafylling med fasta thar sem sponnin lifir a fáum raunverulegum
      gildum.
   4) RODUN <-> ELO EINRAENI. Toflan ber bædi hnattraena rodun og Elo, i
      SITTHVORUM dalki sömu radar; rodun er skilgreind AF Elo, svo eftir
      rodun-vaxandi verdur Elo ekki-vaxandi. Namundun getur ekki snuid
      thessu (namundun er einraen), svo thetta er SANNAD, ekki bara maelt.
      Maelt: 0 brot a 19 pörum (og 0 innan alls ENG-hlutans, 47 pör).
      TEKUR: dalkur sem er ekki ur sömu rod, blandada eda vixlada dalka.
      ATH: toflan er GROPUD EFTIR SAMBANDI og innan ENG i tvo threp
      (Brentford i rod 25 kemur EFTIR Ipswich i rod 143), svo einraenin
      er profud a RODUNARSORTERADA listanum, ekki a skjá-rödinni.
   5) KROSSPROF VID VEGA-BLOBBID, <= 0,6 stig, minnst 8 lid. Sama sidan
      ber fullnakvaemt `{"Name","Elo","Level","FedURL"}` fyrir topp-50 —
      OHAD framsetning a SOMU tolu i SAMA skjali. |namundun| er <= 0,5 med
      byggingu; maelt versta munur 0,435 (Chelsea), og milli tveggja
      sidu-hleðsla flokti hun 0,014, svo 0,6 er 0,5 + fliss. TEKUR: HTML
      sem breytist svo regexid grípur adra en jafn trulega tolu.
   6) THEKJA: OLL 20 FPL-lidin (`MAX_MISSING = 0`) — sja rokin i `fetchElo`.
      Otengd lid eru NEFND i logginu OG i notunni.

   Verdur: `tests/elo-fetch.mjs` a FRYSTU HTML-i
   (`tests/lib/frozen/clubelo-home-2026-08-20.html.gz`, sott med
   `curl -s https://clubelo.com/ | gzip`). Prófid saekir EKKERT — net i
   profasafninu er thad sem tok `euro-congestion.mjs` ut (kafli 5).
   ============================================================ */
export const ELO_WEB_URL = "https://clubelo.com/";
export const ELO_WEB = {
  TRIES: 3,            // vefurinn svarar a 0,11 s; 6 tilraunir = 6,5 min til viðbotar
  MIN_ROWS: 200,       // maelt 643
  MIN_ENG: 25,         // maelt 48
  MIN_ELO: 1300,       // maelt PL-lagmark 1475,5 a 25 timabilum
  MAX_ELO: 2200,       // maelt PL-hamark 2090,1
  MIN_SPREAD: 150,     // maelt 491 i dag; minnsta arstidar-sponn 353
  MIN_DISTINCT: 0.60,  // maelt 45/48 = 94%
  BLOB_TOL: 0.6,       // namundun <= 0,5 med byggingu; maelt versta 0,435
  MIN_BLOB: 8,         // maelt 16 a heimasidunni (hnattraen topp-50)
  MAX_MISSING: 0,      // allt-eda-ekkert; sja rokin i fetchElo
};
// normaliserað: lágstafir, aðeins bókstafir/tölur (þolir bil, punkta, úrfellingar)
export const clubeloNorm = s => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
// mörg möguleg nöfn per lið (ClubElo notar bil í fjölorða nöfnum)
export const CLUBELO_CAND = {
  ARS:["Arsenal"], AVL:["Aston Villa","AstonVilla","Villa"], BOU:["Bournemouth","AFC Bournemouth"],
  BRE:["Brentford"], BHA:["Brighton"], CHE:["Chelsea"], COV:["Coventry","Coventry City"],
  CRY:["Crystal Palace","CrystalPalace","Palace"], EVE:["Everton"], FUL:["Fulham"],
  HUL:["Hull","Hull City"], IPS:["Ipswich","Ipswich Town"], LEE:["Leeds","Leeds United"],
  LIV:["Liverpool"], MCI:["Man City","ManCity","Manchester City"],
  MUN:["Man United","ManUnited","Man Utd","Manchester United"],
  NEW:["Newcastle","Newcastle United"], NFO:["Forest","Nottingham","Nott'm Forest","Nottingham Forest"],
  SUN:["Sunderland"], TOT:["Tottenham","Spurs"], WOL:["Wolves"], BUR:["Burnley"], WHU:["West Ham"],
};

/* Skilar rodum i NAKVAEMLEGA sama snidi sem CSV-id gefur
   (`{Club, Elo, Rank, Level}`) svo porunin nidar i `fetchElo` se EIN
   utfaersla fyrir badar leidir. KASTAR ef eitthvad er ohaeft — kastid
   thydir "haltu gomlu skranni", thvi kallandinn skrifar EKKERT eftir thad. */
export function parseClubEloWeb(html) {
  const bad = m => { throw new Error(`clubelo.com scrape rejected: ${m}`); };
  const H = String(html || "");
  /* Ein rod = eitt lid. `(?:(?!<\/tr>).)*?` bindur hvert svid vid SOMU
     rod — annars getur `alt`, `small` og `td.r` komid ur thremur rodum.
     ARID 2026 stendur a hverri sidu; thad er ekki i thessari stodu og
     kemst thvi ekki inn sem "rating" (og spönn/blob taka thad hvort sem
     er ef thad kemst).                                                  */
  const RE = /<tr><td class="l">(?:(?!<\/tr>).)*?alt="(\w+)"(?:(?!<\/tr>).)*?<small>\s*(\d+)\s*<\/small>(?:(?!<\/tr>).)*?<span class="Ast">([^<]+)<\/span>(?:(?!<\/tr>).)*?<td class="r">(\d+)<\/td><\/tr>/g;
  const rows = [...H.matchAll(RE)].map(m =>
    ({ fed: m[1], Rank: +m[2], Club: m[3].trim(), Elo: +m[4] }));
  if (rows.length < ELO_WEB.MIN_ROWS) {
    bad(`the ranking table has ${rows.length} rows, expected at least `
      + `${ELO_WEB.MIN_ROWS} (measured 643 on 2026-08-20) - the markup changed`);
  }
  const out = rows.filter(r => r.fed === "ENG")
    .map(r => ({ Club: r.Club, Elo: r.Elo, Rank: r.Rank, Level: null }));
  if (out.length < ELO_WEB.MIN_ENG) {
    bad(`only ${out.length} English clubs in the table, expected at least `
      + `${ELO_WEB.MIN_ENG} (measured 48) - the country marker changed`);
  }
  // 1) SVID
  const oob = rows.filter(r => !(r.Elo >= ELO_WEB.MIN_ELO && r.Elo <= ELO_WEB.MAX_ELO));
  if (oob.length) {
    bad(`${oob.length} of ${rows.length} ratings are outside [${ELO_WEB.MIN_ELO}, `
      + `${ELO_WEB.MAX_ELO}] (first: ${oob[0].Club} = ${oob[0].Elo}) - that is not a rating column`);
  }
  // 2) SPONN
  const els = out.map(r => r.Elo);
  const spread = Math.max(...els) - Math.min(...els);
  if (spread < ELO_WEB.MIN_SPREAD) {
    bad(`the English ratings span only ${spread} points (need ${ELO_WEB.MIN_SPREAD}; `
      + `measured 491, and the narrowest Premier League season in 25 is 353) - `
      + `the values have collapsed onto one number`);
  }
  // 3) EINKVAEM GILDI
  const distinct = new Set(els).size, needD = Math.ceil(out.length * ELO_WEB.MIN_DISTINCT);
  if (distinct < needD) {
    bad(`only ${distinct} distinct ratings among ${out.length} English clubs `
      + `(need ${needD}; measured 45 of 48) - most rows carry the same value`);
  }
  // 4) RODUN <-> ELO EINRAENI (a rodunar-sorteradum listanum)
  const asc = [...out].sort((a, b) => a.Rank - b.Rank);
  for (let i = 1; i < asc.length; i++) {
    if (asc[i].Elo > asc[i - 1].Elo) {
      bad(`rank ${asc[i].Rank} (${asc[i].Club} = ${asc[i].Elo}) rates above rank `
        + `${asc[i - 1].Rank} (${asc[i - 1].Club} = ${asc[i - 1].Elo}) - the rating in `
        + `that cell does not belong to that row`);
    }
  }
  // 5) KROSSPROF VID VEGA-BLOBBID
  const blob = [...H.matchAll(/\{[^{}]*"FedURL"[^{}]*\}/g)]
    .map(m => { try { return JSON.parse(m[0]); } catch { return null; } })
    .filter(o => o && o.FedURL === "ENG" && o.Name && Number.isFinite(o.Elo));
  const byName = {};
  out.forEach(r => { byName[clubeloNorm(r.Club)] = r; });
  let seen = 0, worst = 0, worstName = "";
  for (const o of blob) {
    const r = byName[clubeloNorm(o.Name)];
    if (!r) continue;
    seen++;
    const d = Math.abs(o.Elo - r.Elo);
    if (d > worst) { worst = d; worstName = o.Name; }
  }
  if (seen < ELO_WEB.MIN_BLOB) {
    bad(`only ${seen} clubs could be cross-checked against the full-precision chart `
      + `data on the same page (need ${ELO_WEB.MIN_BLOB}; measured 16) - one of the two `
      + `representations is gone, so nothing confirms the other`);
  }
  if (worst > ELO_WEB.BLOB_TOL) {
    bad(`the table and the chart data on the same page disagree by ${worst.toFixed(2)} `
      + `points on ${worstName} (rounding alone is at most 0.5; measured worst 0.435) - `
      + `the table cell being read is not the rating`);
  }
  console.log(`clubelo.com: ${rows.length} rows, ${out.length} English, spread ${spread}, `
    + `${distinct} distinct, ${seen} cross-checked against chart data `
    + `(worst ${worst.toFixed(3)})`);
  return out;
}
/* ---- END ELO WEB FALLBACK ---- */

/* ============================================================
   ALDURS-RODIN ER HREINT FALL — OG HUN VANTADI EINA GREIN (16.8.2026)

   `elo_age`-blokkin i `main()` var skrifud til ad drepa NAKVAEMLEGA eina
   thogn: "GOMUL gogn birt sem NY". Hun bar samt sjalf sama einkenni.
   Kodinn var:
       const ageH = (Date.now() - Date.parse(eloFile.updated)) / 36e5;
       if (Number.isFinite(ageH)) { record("elo_age", ...) }
   — MED ENGRI `else`-grein. Ytra `catch` grípur adeins skra sem VANTAR eda
   thattast ekki; skra sem thattast fint en ber `updated: null`, `updated`
   vantandi eda rusl gefur `ageH = NaN`, skilyrdid slokknar OG RODIN HVERFUR
   UR "Data sources" alveg. Enginn rauður litur, engin gra lina — ekkert.
   Thad er versta utkoman af theim thremur: vord sem thagnar er verri en
   ekkert vord, thvi hun laetur lita ut fyrir ad hafa verid spurt.

   LATENT I DAG (`elo.json.updated` er gilt ISO), svo thetta fannst med
   lestri en ekki i keyrslu — og thess vegna er thad DREGID UT I HREINT FALL
   sem `tests/wiring.mjs` keyrir a TILBUNUM gognum (sama mynstur og
   `mins-trend.mjs` kafli 0 og `lineups.mjs`: fetch.mjs kallar `main()` a
   einingarsviði og verdur thvi ekki flutt inn).

   REGLAN SEM ThETTA FESTIR: fallid skilar ALLTAF rod. Engin leið ut an
   `record`.
   ============================================================ */
export function eloAgeRow(eloFile, nowMs = Date.now()) {
  const stamp = eloFile == null ? undefined : eloFile.updated;
  const ageH = (nowMs - Date.parse(stamp)) / 36e5;
  if (!Number.isFinite(ageH)) {
    /* Gildid sjalft er i notunni: "unparseable" eitt og ser segir ekki hvort
       sviðid vanti, se null eda beri annad snid en ISO.                    */
    const seen = stamp === undefined ? "missing" : `"${String(stamp).slice(0, 40)}"`;
    return { ok: false, count: 0,
      note: `elo.json has no usable 'updated' timestamp (${seen}) - the age cannot be `
          + "computed, so FFDR may be running on old Elo with nothing saying so" };
  }
  const days = ageH / 24;
  return { ok: days < 2, count: Math.round(ageH),
    note: days < 2 ? `${ageH.toFixed(1)}h old`
                   : `STALE: ${days.toFixed(1)} days old - FFDR is running on old Elo `
                     + "(the fetch failing does not delete elo.json, so the model keeps going quietly)" };
}

/* ========== 5. FOOTBALL-DATA.CO.UK — CSV ========== */
async function fetchFdcouk() {
  /* E0 yfirstandandi timabil. FYRIR TIMABIL ER SKRAIN EKKI TIL og
     football-data skilar 404 — thad er EDLILEGT astand, ekki bilun, og a
     ekki ad birtast sem raud villa i Gagnaheimildum. Vid greinum a milli:
     404 = "bidur timabils", allt annad = raunveruleg villa.               */
  let text;
  try {
    ({ text } = await getText("https://www.football-data.co.uk/mmz4281/2627/E0.csv"));
  } catch (e) {
    /* ============================================================
       ThRIDJA UTGAFAN AF SOMU ROD: 404 -> 301 -> 300 (maelt 20.8.2026).
       Skrain er ekki til enn, en football-data hefur SVARAD ThVI a thrja
       vegu a thremur vikum:
         404  upphaflega — "not found", einfalt og medhondlad hér.
         301  14.8. — redirect a `EC.csv` (National League). `fetch` fylgir
              redirectum ThEGJANDI, svo hann kom sem 200 med rongum gognum;
              thad er Div-vordurinn nedar sem stodvar hann, ekki thessi
              blokk.
         300  20.8. — "Multiple Choices" fra Apache mod_speling. `fetch`
              fylgir 300 EKKI (ekkert `Location`-haus er sent), svo
              `getText` kastar "300 …", thad fell ekki i 404-greinina og
              heimildin vard RAUD med engu odru en tolunni "300".
       MAELT beint a svarinu, ekki agiskad: bodyid (729 b) segir ordrett
       "The document name you requested (/mmz4281/2627/E0.csv) could not be
       found on this server" og bydur `EC.csv`/`E3.csv`/`E2.csv` sem
       "mistyped character". 300 ThYDIR ThVI NAKVAEMLEGA ThAD SAMA OG 404 —
       PL-skrain er ekki til — og mod_speling kviknar ADEINS thegar slodin
       finnst ekki, svo hann getur ekki komid a skra sem ER til.
       Tolunni er haldid i notunni: "bidur timabils" a ekki ad hylja HVERNIG
       heimildin sagdi thad, thvi naesta utgafa af thessari rod verdur
       fjorda og tha vill madur sja hana.
       Div-vordurinn nedar er OHREYFDUR og er onnur, ohad vorn: hann tekur
       200-svor sem bera adra deild, sem thessi blokk sér aldrei.
       ============================================================ */
    const st = Number(/^(\d{3}) /.exec(String(e?.message || ""))?.[1]) || 0;
    if (st === 404 || st === 300) {
      record("fdcouk_e0", true, 0,
        `waiting for the season — E0 2026/27 is created at the first match (HTTP ${st})`);
      return;
    }
    throw e;
  }
  const { header, rows } = parseCSV(text);
  console.log(`fdcouk E0 columns: ${header.slice(0, 20).join(",")}…`);
  /* ============================================================
     DEILDIN VERDUR AD VERA E0 — MAELT 14.8.2026, VILLAN VAR LIFANDI.
     football-data 301-REDIRECTAR `mmz4281/2627/E0.csv` yfir a `EC.csv`
     (National League) medan PL-skrain er ekki til enn. `fetch` fylgir
     redirectum thegjandi, og hér var ADEINS 404 sannreynt — svo skrain
     data/fdcouk/E0-2627.json bar 12 radir med `Div: "EC"` (Altrincham,
     Boreham Wood, Southend) og status.json sagdi `fdcouk_e0 ok:true`.
     ThRENNT gerdi thetta verra en tomt svar:
       1. Graen heimild sem ber gogn ur ANNARRI deild.
       2. `gw1-checklist.mjs` spyr "er E0-2627 til med rodum?" — sem var
          ThEGAR uppfyllt af utandeildar-rodum, svo gatlistinn hefdi
          orðið graenn af RANGRI astaedu 21. agust.
       3. Se akvordunin i CLAUDE.md um ad blanda yfirstandandi timabili
          inn i lidsstyrk tekin adur en redirectid hverfur, blandast
          National League inn i PL-styrk.
     ThAD ER ENGIN NAFNA-VORPUN HER: `Div` er dalkur i skranni sjalfri,
     svo thetta er sannreyning, ekki agiskun. Ohreint svar er MEDHONDLAD
     EINS OG 404 — "bidur timabils" — thvi thad er nakvaemlega thad sem
     redirectid thydir: PL-skrain er ekki til enn.
     ============================================================ */
  const divs = [...new Set(rows.map(r => r.Div).filter(Boolean))];
  const e0Rows = rows.filter(r => r.Div === "E0");
  if (!e0Rows.length) {
    record("fdcouk_e0", true, 0,
      `waiting for the season — the 2627 E0 path serves ${divs.join("/") || "no Div column"} `
      + `(football-data redirects it until the PL file exists), so nothing was written`);
    return;
  }
  /* Blandad svar er ekki "nogu gott": ef E0-radir eru til en adrar deildir
     fljota med er adeins E0 skrifad, og talan i status segir bædi.        */
  await writeJSON("fdcouk/E0-2627.json", { header, rows: e0Rows });
  record("fdcouk_e0", true, e0Rows.length,
    divs.length > 1 ? `E0 only; the file also carried ${divs.filter(d => d !== "E0").join("/")}` : null);
}

/* ========== 5b. SÖGULEG E0 — H2H, dómarar, heima/úti, lokalínur ==========
   Sama heimild sem þegar er notuð (football-data.co.uk), en söguleg tímabil.
   Leikjatölur eru til frá 2017/18. Þetta gefur gögn NÚNA, óháð tímabilsbyrjun:
   - innbyrðis viðureignir liða
   - dómara-tilhneiging til spjalda (áhrif á bann-hættu)
   - heima/úti-mynstur
   - lokalínur (skarpasta fría líkindaspáin)
   SÆKT EINU SINNI — skrárnar breytast ekki eftir að tímabil er lokið.        */
async function fetchHistoricalE0() {
  /* 15 TÍMABIL (28.7.2026) = 14 SPÁÐ; fyrsta er aðeins styrk-heimild.
     Leikjatölur (HST/AST) eru til frá 1112 svo liðsstyrkur er heill alla
     leið; yfir/undir og asískt handicap koma úr Betbrain-meðaltölum
     (BbAv>2.5 / BbAHh) fyrir 2019 og úr B365/Avg eftir það — fallröðin
     í tests/lib/e0.mjs marketForRow() sér um það. */
  const SEASONS = ["1112","1213","1314","1415","1516","1617","1718","1819","1920","2021","2122","2223","2324","2425","2526"];
  const allRows = [];
  let fetchedSeasons = 0;
  for (const ss of SEASONS) {
    const path = `fdcouk/E0-${ss}.json`;
    if (existsSync(`${DATA}/${path}`)) {
      try { allRows.push(...JSON.parse(await readFile(`${DATA}/${path}`, "utf8")).rows); } catch {}
      continue;
    }
    try {
      const { text } = await getText(`https://www.football-data.co.uk/mmz4281/${ss}/E0.csv`);
      const { header, rows } = parseCSV(text);
      // VARÚÐ frá football-data.co.uk: Pinnacle-fæðið (PS*/PSC*) er óáreiðanlegt
      // frá 23.07.2025 og ekki lengur notað í meðaltöl. Merkjum það.
      const untrusted = header.filter(h => /^PSC?[HDA]$/.test(h));
      await writeJSON(path, { season: ss, header, rows,
        untrusted_columns: untrusted,
        untrusted_note: "Pinnacle lines unreliable since 2025-07-23 — do not use in averages." });
      allRows.push(...rows);
      fetchedSeasons++;
      console.log(`fdcouk E0-${ss}: ${rows.length} matches`);
      await new Promise(r => setTimeout(r, 600));
    } catch (e) { console.warn(`fdcouk E0-${ss}: ${e.message}`); }
  }
  if (!allRows.length) { record("fdcouk_history", false, 0, "no historical data"); return; }

  // ---- Dómara-tilhneiging: spjöld per leik ----
  const refs = {};
  for (const r of allRows) {
    const ref = (r.Referee || "").trim();
    if (!ref) continue;
    const y = (+r.HY || 0) + (+r.AY || 0);
    const rd = (+r.HR || 0) + (+r.AR || 0);
    const f = (+r.HF || 0) + (+r.AF || 0);
    const a = refs[ref] || (refs[ref] = { games:0, yellow:0, red:0, fouls:0 });
    a.games++; a.yellow += y; a.red += rd; a.fouls += f;
  }
  const refOut = {};
  const leagueAvgY = Object.values(refs).reduce((s,a)=>s+a.yellow,0) /
                     Math.max(1, Object.values(refs).reduce((s,a)=>s+a.games,0));
  for (const [ref, a] of Object.entries(refs)) {
    if (a.games < 20) continue; // of lítið úrtak
    refOut[ref] = {
      games: a.games,
      yellow_pg: +(a.yellow / a.games).toFixed(2),
      red_pg: +(a.red / a.games).toFixed(3),
      fouls_pg: +(a.fouls / a.games).toFixed(1),
      // hlutfall á móti meðaltali: 1.2 = 20% fleiri spjöld en meðal-dómari
      card_index: +((a.yellow / a.games) / (leagueAvgY || 1)).toFixed(2),
    };
  }
  await writeJSON("fdcouk/referees.json", {
    updated: status.updated, seasons: SEASONS, league_avg_yellow_pg: +leagueAvgY.toFixed(2),
    note: "card_index > 1 = more cards than the average referee. Feeds player suspension risk.",
    referees: refOut,
  });

  // ---- Innbyrðis viðureignir (H2H) per liðapar ----
  const h2h = {};
  for (const r of allRows) {
    const h = (r.HomeTeam || "").trim(), a = (r.AwayTeam || "").trim();
    if (!h || !a) continue;
    const key = `${h}|${a}`;
    const o = h2h[key] || (h2h[key] = {
      games:0, home_w:0, draw:0, away_w:0, gf:0, ga:0, btts:0, over25:0,
      cs_home:0, cs_away:0, // TELJUM hrein blöð beint — ekki afleiða úr BTTS
    });
    o.games++;
    const hg = +r.FTHG || 0, ag = +r.FTAG || 0;
    o.gf += hg; o.ga += ag;
    if (r.FTR === "H") o.home_w++; else if (r.FTR === "D") o.draw++; else o.away_w++;
    if (hg > 0 && ag > 0) o.btts++;
    if (hg + ag > 2.5) o.over25++;
    if (ag === 0) o.cs_home++;   // heimalið hélt hreinu = úti skoraði 0
    if (hg === 0) o.cs_away++;   // útilið hélt hreinu = heima skoraði 0
  }
  const h2hOut = {};
  for (const [k, o] of Object.entries(h2h)) {
    if (o.games < 2) continue;
    h2hOut[k] = {
      games: o.games, home_w: o.home_w, draw: o.draw, away_w: o.away_w,
      home_w_pct: Math.round(o.home_w / o.games * 100),
      cs_home_pct: Math.round(o.cs_home / o.games * 100),
      cs_away_pct: Math.round(o.cs_away / o.games * 100),
      avg_goals: +((o.gf + o.ga) / o.games).toFixed(2),
      goals_home_pg: +(o.gf / o.games).toFixed(2),
      goals_away_pg: +(o.ga / o.games).toFixed(2),
      btts_pct: Math.round(o.btts / o.games * 100),
      over25_pct: Math.round(o.over25 / o.games * 100),
    };
  }
  await writeJSON("fdcouk/h2h.json", {
    updated: status.updated, seasons: SEASONS,
    note: "Keyed 'HomeTeam|AwayTeam' with fdcouk names. A historical pattern, not a forecast.",
    pairs: h2hOut,
  });

  record("fdcouk_history", true, allRows.length,
    `${fetchedSeasons} new seasons · ${Object.keys(refOut).length} referees · ${Object.keys(h2hOut).length} team pairs`);
}

/* ========== 6. NÝLIÐA-GRUNNLÍNA — B-deild 2025/26, EINU SINNI ========== */
async function fetchPromotedBaseline() {
  const path = `${DATA}/promoted_baseline.json`;
  if (existsSync(path)) { record("promoted_baseline", true, 0, "already present — skipped"); return; }
  const { text } = await getText("https://www.football-data.co.uk/mmz4281/2526/E1.csv");
  const { rows } = parseCSV(text);
  const promoted = ["Coventry", "Hull", "Ipswich"];
  const agg = {};
  const bump = (team, isHome, r) => {
    const a = agg[team] || (agg[team] = { games:0, shots:0, sot:0, goals:0, sh_ag:0, sot_ag:0, goals_ag:0 });
    a.games++;
    a.shots += +(isHome ? r.HS : r.AS) || 0;
    a.sot   += +(isHome ? r.HST : r.AST) || 0;
    a.goals += +(isHome ? r.FTHG : r.FTAG) || 0;
    a.sh_ag += +(isHome ? r.AS : r.HS) || 0;
    a.sot_ag+= +(isHome ? r.AST : r.HST) || 0;
    a.goals_ag += +(isHome ? r.FTAG : r.FTHG) || 0;
  };
  for (const r of rows) {
    if (promoted.includes(r.HomeTeam)) bump(r.HomeTeam, true, r);
    if (promoted.includes(r.AwayTeam)) bump(r.AwayTeam, false, r);
  }
  const out = {};
  for (const [team, a] of Object.entries(agg)) {
    out[team] = { source: "championship_proxy", games: a.games,
      shots_pg: +(a.shots/a.games).toFixed(2), sot_pg: +(a.sot/a.games).toFixed(2),
      goals_pg: +(a.goals/a.games).toFixed(2), conv: a.shots? +(a.goals/a.shots).toFixed(3):0,
      shots_against_pg: +(a.sh_ag/a.games).toFixed(2), sot_against_pg: +(a.sot_ag/a.games).toFixed(2),
      goals_against_pg: +(a.goals_ag/a.games).toFixed(2) };
  }
  await writeJSON("promoted_baseline.json", out);
  record("promoted_baseline", true, Object.keys(out).length, "championship_proxy");
}

/* ========== 7. OPEN-METEO — veður fyrir óspilaða leiki ========== */
async function fetchWeather() {
  const fixtures = JSON.parse(await readFile(`${DATA}/fixtures.json`, "utf8"));
  const teamsMap = JSON.parse(await readFile(`${DATA}/teams_map.json`, "utf8"));
  const upcoming = fixtures.filter(f => !f.finished && f.kickoff_time);
  const out = [];
  for (const f of upcoming) {
    const home = teamsMap[f.team_h];
    if (!home || home.lat == null) continue;
    const d = f.kickoff_time.slice(0, 10);
    // spá nær ~16 daga; lengra fær null
    const daysAhead = (new Date(d) - new Date(today)) / 86400000;
    if (daysAhead > 16) { out.push({ fixture_id: f.id, kickoff: f.kickoff_time, temp_c: null, precip_mm: null, wind_kmh: null, gust_kmh: null }); continue; }
    try {
      const u = `https://api.open-meteo.com/v1/forecast?latitude=${home.lat}&longitude=${home.lon}`
        + `&hourly=temperature_2m,precipitation,wind_speed_10m,wind_gusts_10m&start_date=${d}&end_date=${d}&timezone=UTC`;
      const w = await getJSON(u);
      const hour = f.kickoff_time.slice(11, 13) + ":00";
      const idx = (w.hourly?.time || []).findIndex(t => t.slice(11, 16) === hour);
      const i = idx >= 0 ? idx : 15; // fallback ~kickoff hádegi
      out.push({ fixture_id: f.id, kickoff: f.kickoff_time,
        temp_c: w.hourly?.temperature_2m?.[i] ?? null,
        precip_mm: w.hourly?.precipitation?.[i] ?? null,
        wind_kmh: w.hourly?.wind_speed_10m?.[i] ?? null,
        gust_kmh: w.hourly?.wind_gusts_10m?.[i] ?? null });
      await new Promise(r => setTimeout(r, 300));
    } catch (e) { console.warn(`weather fixture ${f.id}: ${e.message}`); }
  }
  await writeJSON("weather.json", { updated: status.updated, fixtures: out });
  record("weather", true, out.length);
}


/* 3b. UNDERSTAT — KAFLINN ER FARINN OG FASTINN MED (10.8.2026).
   Hér stod `const BIG_CHANCE_XG = 0.30;` sem ENGINN las (0 notkunarstadir)
   og sem STANGADIST A vid maelda gildid: `src/bsd.js` notar **0,18**, fittad
   gegn raunverulega lids-svidinu `big_chances` (MAE 0,746, r 0,774 a 748
   lid-leikjum). Tvaer olikar tolur undir sama nafni i sama repo er gildra
   fyrir naesta lesanda — hann hefdi getad "samraemt" i ranga att.
   Understat-heimildin sjalf var tekin ur sambandi (kafli 6 i CLAUDE.md).  */


/* ========== 9b. EVRÓPULEIKIR — álag/rótasjón (sjálf-greinandi) ==========
   FPL-API-ið veit ekkert um Evrópukeppnir. Tveir kostir:
   (a) ESPN almenna API — enginn lykill, nær yfir allar UEFA-keppnir, en ÓFORMLEGT
   (b) football-data.org — Meistaradeild frí "forever", þarf frían lykil (EURO_API_KEY)
   Slóðir/keppnikóðar eru ÓSTAÐFESTIR: við prófum nokkra og LOGGUM hvað svarar.
   ATH: UEFA-keppnir byrja um 16. sept 2026 -> GW1-4 hafa engin Evrópuleiki.       */
async function fetchEuro() {
  const found = [];
  const matches = [];
  const seen = new Set();

  // --- Varpa liðanöfnum á FPL-id (normaliserað, þolir mismunandi stafsetningu) ---
  const norm = s => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "")
    .replace(/^afc/, "").replace(/fc$/, "").replace(/^the/, "");
  const fplByNorm = {};
  for (const [id, t] of Object.entries(teamsById)) {
    fplByNorm[norm(t.name)] = Number(id);
    fplByNorm[norm(t.short_name)] = Number(id);
    // algeng löng nöfn sem ESPN/fd.org nota
    const LONG = {
      ARS:["Arsenal"], AVL:["Aston Villa"], BOU:["Bournemouth","AFC Bournemouth"],
      BRE:["Brentford"], BHA:["Brighton & Hove Albion","Brighton and Hove Albion"],
      CHE:["Chelsea"], COV:["Coventry City"], CRY:["Crystal Palace"], EVE:["Everton"],
      FUL:["Fulham"], HUL:["Hull City"], IPS:["Ipswich Town"], LEE:["Leeds United"],
      LIV:["Liverpool"], MCI:["Manchester City"], MUN:["Manchester United"],
      NEW:["Newcastle United"], NFO:["Nottingham Forest"], SUN:["Sunderland"],
      TOT:["Tottenham Hotspur"],
    }[t.short_name] || [];
    LONG.forEach(n => fplByNorm[norm(n)] = Number(id));
  }


  // --- (0) UPPGÖTVUN: spyrja ESPN hvaða keppnir eru til í fótbolta.
  // Í stað þess að giska á kóða loggum við þá sem raunverulega eru í boði.
  // Loggið úr þessu skrefi gerir næstu útgáfu nákvæma.
  let discovered = [];
  for (const durl of [
    "https://site.api.espn.com/apis/site/v2/sports/soccer",
    "https://site.api.espn.com/apis/site/v2/sports/soccer/leagues",
  ]) {
    try {
      const r = await fetchT(durl, { headers: { "User-Agent": UA } });
      if (!r.ok) { console.log(`Europe discovery ${durl.slice(-30)}: HTTP ${r.status}`); continue; }
      const j = await r.json();
      // ESPN skilar ýmsum formum — grípum öll 'slug'/'id' sem líkjast keppnikóða
      const codes = new Set();
      const walk = o => {
        if (!o || typeof o !== "object") return;
        if (typeof o.slug === "string" && o.slug.includes(".")) codes.add(o.slug);
        if (typeof o.id === "string" && o.id.includes(".")) codes.add(o.id);
        Object.values(o).forEach(walk);
      };
      walk(j);
      discovered = [...codes];
      const relevant = discovered.filter(c => /uefa|^eng\.|fifa\.cwc/i.test(c));
      console.log(`Europe discovery: ${discovered.length} codes, relevant (${relevant.length}): ${relevant.join(", ")}`);
      // Æfingarleikir: LOGGA en EKKI nota. Þeir mega ekki skekkja álagsreikning
      // (falskar tvöfaldar umferðir). Sjá FRIENDLY_BLOCK neðar.
      const friendlyCodes = discovered.filter(c => /friendly|friendlies|preseason|pre_season/i.test(c));
      if (friendlyCodes.length) console.log(`Friendly codes (NOT used): ${friendlyCodes.join(", ")}`);
      if (discovered.length) break;
    } catch (e) { console.log(`Europe discovery failed: ${e.message}`); }
  }

  // --- (a) ESPN: nota uppgötvaða kóða ef til, annars kandídata ---
  // UEFA + innlendar bikarkeppnir + forkeppnir. Kóðar ÓSTAÐFESTIR — prófum og loggum.
  const CANDIDATES = [
    "uefa.champions", "uefa.europa", "uefa.europa.conf", "uefa.super_cup",
    "uefa.champions_qual", "uefa.europa_qual", "uefa.conf_qual",
    "eng.fa", "eng.league_cup", "eng.charity", "fifa.cwc",
  ];
  // VÖRN: æfingarleikir og vinamót eru útilokuð. Þeir eru ekki keppnisleikir og
  // myndu skekkja álag/rótasjón (og búa til falskar tvöfaldar umferðir).
  const FRIENDLY_BLOCK = /friendly|friendlies|preseason|pre_season|testimonial|trophy\.pre/i;
  const ESPN_CODES = (discovered.length
    ? [...new Set([...discovered.filter(c => /uefa|^eng\.(fa|league_cup|charity)|fifa\.cwc/i.test(c)), ...CANDIDATES])]
    : CANDIDATES).filter(c => !FRIENDLY_BLOCK.test(c));
  console.log(`Europe: trying ${ESPN_CODES.length} codes`);
  const d1 = today.replace(/-/g, "");
  const end = new Date(Date.now() + 150 * 86400000).toISOString().slice(0, 10).replace(/-/g, "");
  for (const code of ESPN_CODES) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${code}/scoreboard?dates=${d1}-${end}`;
    try {
      const r = await fetchT(url, { headers: { "User-Agent": UA } });
      if (!r.ok) { console.log(`Europe ESPN ${code}: HTTP ${r.status}`); continue; }
      const j = await r.json();
      const evs = j.events || [];
      console.log(`Europe ESPN ${code}: OK, ${evs.length} fixtures`);
      if (evs.length) found.push(`espn:${code}(${evs.length})`);
      for (const e of evs) {
        const comp = (e.competitions || [])[0];
        const teams = (comp?.competitors || []).map(c => c.team?.displayName || c.team?.name).filter(Boolean);
        if (teams.length !== 2) continue;
        const key = `${e.date}|${teams.join("|")}`;
        if (seen.has(key)) continue;
        seen.add(key);
        matches.push({ comp: code, date: e.date, home: teams[0], away: teams[1] });
      }
      await new Promise(r => setTimeout(r, 350));
    } catch (e) { console.log(`Europe ESPN ${code}: ${e.message}`); }
  }

  // --- (b) football-data.org (aðeins ef lykill er til) ---
  const euroKey = process.env.EURO_API_KEY || "";
  if (euroKey) {
    for (const comp of ["CL", "EL"]) {
      try {
        // MIKILVÆGT: án dateFrom/dateTo skilar fd.org NÝJASTA tímabili sem það hefur
        // (t.d. 2025/26 áður en dráttur 2026/27 er gerður) -> úreltar dagsetningar.
        const dTo = new Date(Date.now() + 300 * 86400000).toISOString().slice(0, 10);
        const r = await fetchT(
          `https://api.football-data.org/v4/competitions/${comp}/matches?dateFrom=${today}&dateTo=${dTo}`,
          { headers: { "X-Auth-Token": euroKey, "User-Agent": UA } });
        if (!r.ok) { console.log(`Europe fd.org ${comp}: HTTP ${r.status}`); continue; }
        const j = await r.json();
        const ms = j.matches || [];
        console.log(`Europe fd.org ${comp}: OK, ${ms.length} matches`);
        found.push(`fdorg:${comp}(${ms.length})`);
        for (const m of ms) {
          const h = m.homeTeam?.shortName || m.homeTeam?.name, a = m.awayTeam?.shortName || m.awayTeam?.name;
          if (!h || !a) continue;
          const key = `${m.utcDate}|${h}|${a}`;
          if (seen.has(key)) continue;
          seen.add(key);
          matches.push({ comp, date: m.utcDate, home: h, away: a });
        }
      } catch (e) { console.log(`Europe fd.org ${comp}: ${e.message}`); }
    }
  } else {
    console.log("Europe: EURO_API_KEY missing — skipping football-data.org (ESPN still tried)");
  }

  // --- (c) ÞÁTTTAKA 2026/27: hverjir eru í Evrópu, þótt leikir séu ódregnir.
  // Þetta er nothæft fyrir álagsplönun MÁNUÐUM áður en dráttur er gerður.
  const participation = {};
  const partOk = [];
  if (euroKey) {
    for (const comp of ["CL", "EL", "ECL"]) {
      try {
        const r = await fetchT(`https://api.football-data.org/v4/competitions/${comp}/teams`,
          { headers: { "X-Auth-Token": euroKey, "User-Agent": UA } });
        if (!r.ok) { console.log(`Participation ${comp}: HTTP ${r.status}`); continue; }
        const j = await r.json();
        const season = j.season?.startDate ? j.season.startDate.slice(0, 4) : "?";
        const tms = j.teams || [];
        let eng = 0;
        for (const t of tms) {
          const nm = t.shortName || t.name;
          const id = fplByNorm[norm(nm)] ?? fplByNorm[norm(t.name)] ?? null;
          if (id) {
            (participation[id] = participation[id] || []).push(comp);
            eng++;
          }
        }
        console.log(`Participation ${comp}: season ${season}, ${tms.length} clubs, ${eng} English`);
        found.push(`part:${comp}(${eng}eng)`);
        partOk.push(comp);
      } catch (e) { console.log(`Participation ${comp}: ${e.message}`); }
    }
  }

  /* ---- THATTTAKA UR ESPN-LEIKJUNUM SEM VID SOTTUM HVORT ED ER ----

     VILLAN SEM NOTANDINN FANN: "Man Utd er i Evropu en er ekki med
     stjornu". Rett — `participation` bar ADEINS CL. Lykkjan hér ad ofan
     bidur um CL, EL og ECL, en okeypis threp football-data.org gefur
     adeins CL, svo EL og ECL FELLU THEGJANDI: villan for i console.log og
     hvergi annad, `found` fekk enga faerslu, og status.json vissi ekkert.
     Notandinn sa lid an stjornu og gat ekki vitad hvort thad thydi "ekki i
     Evropu" eda "vid vitum thad ekki" — nakvaemlega greinarmunurinn sem
     CLAUDE.md kafli 8 gerir milli `null` og `0`.

     LAGFAERINGIN NOTAR GOGN SEM VORU THEGAR I HENDI: ESPN-undankeppnirnar
     (`uefa.champions_qual`, `uefa.europa_qual`) eru sottar OG TOKUST — 10
     og 13 leikir — en their leikir eru allir i fortidinni og duttu ut i
     stale-siunni, svo thatttakan for med theim. Vid lesum hana ut ADUR en
     siad er: lid sem SPILAR i undankeppni Evropu ER i Evropu.           */
  /* LYKLARNIR VERDA AD VERA NAKVAEMLEGA THEIR SOMU OG I ESPN-LISTANUM
     HER AD OFAN. Fyrsta utgafan min skrifadi "uefa.conference_qual" og
     "uefa.conference" — en listinn notar `uefa.conf_qual` og
     `uefa.europa.conf`, svo Sambandsdeildar-lid hefdu FENGID ENGA STJORNU:
     nakvaemlega villan sem eg var ad laga, endurtekin i lagfaeringunni.
     Vordur: tests/euro-participation.mjs ber thennan lykla-lista saman vid
     ESPN-listann og fellur ef keppni baetist vid an merkis.             */
  const COMP_TO_TAG = {
    "uefa.champions": "CL",      "uefa.champions_qual": "CL",
    "uefa.europa": "EL",         "uefa.europa_qual": "EL",
    "uefa.europa.conf": "ECL",   "uefa.conf_qual": "ECL",
  };
  let fromFixtures = 0;
  for (const m of matches) {
    const tag = COMP_TO_TAG[m.comp];
    if (!tag) continue;
    for (const nm of [m.home, m.away]) {
      const id = fplByNorm[norm(nm || "")] ?? null;
      if (id == null) continue;
      const cur = participation[id] = participation[id] || [];
      if (!cur.includes(tag)) { cur.push(tag); fromFixtures++; }
    }
  }
  if (fromFixtures) found.push(`part-from-fixtures(${fromFixtures})`);

  /* THEKJAN ER SKRAD, EKKI THOGD. Ef EL/ECL vantar er stjarnan "i
     Meistaradeildinni", ekki "i Evropu", og thad verdur ad sjast.       */
  record("euro_participation", partOk.length > 0, Object.keys(participation).length,
    partOk.length === 3
      ? "CL + EL + ECL"
      : `only ${partOk.join(", ") || "none"} from football-data.org`
        + (fromFixtures ? `; ${fromFixtures} more from ESPN fixtures` : "")
        + " - clubs in the missing competitions carry NO star");

  // Aðeins leikir sem varða ensk lið (það er allt sem hefur áhrif á FPL-álag)
  const out = [];
  const unmatched = new Set();
  let stale = 0, friendlySkipped = 0;
  for (const m of matches) {
    // HARÐUR FILTER: sleppa öllu sem er í fortíðinni. Heimildir skila stundum
    // síðasta tímabili þegar nýtt er ekki dregið — þau gögn eru verri en engin.
    if (!m.date || m.date.slice(0, 10) < today) { stale++; continue; }
    // Auka-vörn: ef keppnin er æfingarleikur, sleppa (á ekki að gerast en tryggjum).
    if (/friendly|preseason|testimonial/i.test(m.comp)) { friendlySkipped++; continue; }
    const hId = fplByNorm[norm(m.home)] ?? null;
    const aId = fplByNorm[norm(m.away)] ?? null;
    if (!hId && !aId) {
      if (/united|city|arsenal|chelsea|liverpool|tottenham|villa|forest|newcastle|brighton/i.test(`${m.home} ${m.away}`))
        unmatched.add(`${m.home} v ${m.away}`);
      continue;
    }
    out.push({ comp: m.comp, date: m.date, home: m.home, away: m.away, home_fpl: hId, away_fpl: aId });
  }
  if (stale) console.log(`Europe: skipped ${stale} stale matches (dated before ${today})`);
  if (friendlySkipped) console.log(`Europe: skipped ${friendlySkipped} friendlies (not competitive matches)`);
  if (unmatched.size) console.log(`Europe: unmatched English-looking names: ${[...unmatched].slice(0,8).join(" | ")}`);

  // Álag per lið: fjöldi Evrópuleikja og dagsetningar (framendinn parar við FPL-umferðir)
  const byTeam = {};
  out.forEach(m => {
    [m.home_fpl, m.away_fpl].forEach(id => {
      if (!id) return;
      (byTeam[id] = byTeam[id] || []).push({ comp: m.comp, date: m.date });
    });
  });

  /* ENSK HEITI — VIDMOTID ER ENSKT OG ThESSI ERU BIRT.
     Voru islensk ("Meistaradeild", "Ofurbikar", "Ligubikar") og rotudu
     beint inn i leikjalistann a leikmannaspjaldinu: maelt 9.8.2026 bar
     spjald Aston Villa-manns "Ofurbikar" i enskri toflu, og eftir drattinn
     hefdi "Meistaradeild" birst a sex felogum.

     `src/model.js` (COMP_EN) thydir lika eftir `comp`-audkenninu, svo
     appid er varid thott GOMUL gogn seu enn i data/. Bædi eru til
     staðar viljandi: hér er upprunin lagfaerdur, thar er vornin.        */
  const COMP_LABEL = {
    "uefa.champions":"Champions League", "uefa.europa":"Europa League",
    "uefa.europa.conf":"Conference League", "uefa.super_cup":"Super Cup",
    "eng.fa":"FA Cup", "eng.league_cup":"League Cup", "eng.charity":"Community Shield",
    "uefa.champions_qual":"UCL qualifying", "uefa.europa_qual":"UEL qualifying",
    "uefa.conf_qual":"UECL qualifying",
    "fifa.cwc":"Club World Cup", CL:"Champions League", EL:"Europa League",
  };
  out.forEach(m => { m.comp_label = COMP_LABEL[m.comp] || m.comp; });
  Object.values(byTeam).forEach(arr => arr.forEach(x => { x.comp_label = COMP_LABEL[x.comp] || x.comp; }));

  await writeJSON("euro_fixtures.json", {
    updated: status.updated, sources_ok: found,
    fixtures: out, by_team: byTeam, participation,
    note: "European and cup matches for English clubs. by_team is keyed on FPL team id. participation = which competition a club is in for 2026/27 (usable even before the draw is made).",
  });
  record("euro_fixtures", true, out.length,
    `${stale} stale skipped · ${found.length ? found.join(",") : "no source answered"}`);
}

/* ========== 8. THE ODDS API — bókmakara-CS% (FÆRT ÚR NETLIFY Á CRON) ==========
   Var áður Netlify-function (kostaði credit við hverja opnun appsins).
   Nú: cron sækir 1x/dag, skrifar data/odds.json, appið les frítt frá GitHub.
   Kvóti: markets(2) × regions(1) = 2 kredit/dag = ~60/mán af 500. Óhætt.
   Lykill: process.env.ODDS_API_KEY (GitHub Secret) — ALDREI í kóða.          */
/* poissonCleanSheet · MARKET_CALIB · lambdaFromOver · devig · devig2 ·
   splitGoals · marketGoals · marketDiff eru NÚ Í src/market.js (sjá
   import að ofan). Ekki afrita þau hingað aftur — bakprófið mælir
   markaðsliðinn með sömu skrá.                                         */

/* ---- HVENÆR Á AÐ SÆKJA ODDS? ----
   Daglega = 30 köll x 3 kredit = 90/mán. Óþarfi: lína á þriðjudegi hefur
   ekkert að segja um ákvörðun sem er tekin á föstudegi.
   TVISVAR PER UMFERÐ er betur stillt við ákvörðunarpunkta OG 72% ódýrara:
     1) "skörp" sókn innan 36 klst fyrir frest — línan er sem næst lokalínu
     2) "plönunar" sókn 6-8 dögum fyrir frest — fyrir framtíðar-skipti
   ~8,4 köll/mán x 3 = ~25 kredit af 500.                                  */
async function shouldFetchOdds() {
  let events = [];
  try { events = JSON.parse(await readFile(`${DATA}/events.json`, "utf8")).events; } catch { return { go: true, why: "no events" }; }
  const next = events.find(e => e.deadline_time && new Date(e.deadline_time) > new Date());
  if (!next) return { go: false, why: "no gameweek ahead" };
  const hrs = (new Date(next.deadline_time) - new Date()) / 3600000;
  const inSharp = hrs > 0 && hrs <= 36;
  const inPlan  = hrs >= 144 && hrs <= 192;      // 6-8 dagar
  if (!inSharp && !inPlan) return { go: false, why: `${Math.round(hrs)}h to the GW${next.id} deadline — outside the window` };
  // ekki sækja tvisvar í sama glugga
  try {
    const prev = JSON.parse(await readFile(`${DATA}/odds.json`, "utf8"));
    const age = (new Date() - new Date(prev.updated)) / 3600000;
    const win = inSharp ? "sharp" : "plan";
    if (prev.window === win && age < 30)
      return { go: false, why: `${win} window already fetched ${Math.round(age)}h ago` };
  } catch {}
  return { go: true, why: inSharp ? "sharp" : "plan", window: inSharp ? "sharp" : "plan", gw: next.id };
}

/* ========== API-SPORTS (api-football.com v3) — MEIÐSLI ==========
   FPL-fréttirnar segja "knock — 75%" en ekki HVAÐ er að. /injuries
   gefur TEGUND (Hamstring, Knee, Illness...) og hvaða leik hún tengist.

   FYRIRVARI SEM VERÐUR AÐ PRÓFA EMPÍRÍSKT: frítt þrep er "limited in
   terms of available seasons" — ef season=2026 er læst reynum við
   date-leiðina í staðinn og skráum hráu villuna í status.json svo
   sannleikurinn sjáist eftir fyrstu keyrslu.

   Kvóti: /status er FRÍTT (telst ekki), gagnakallið er 1/dag = 1% af
   100 kalla dagskvótanum.                                            */
const APIS = "https://v3.football.api-sports.io";
/* KVOTA-VORDUR. Fria threpid er 100 koll/dag og REIKNINGURINN VAR UPPSAGDUR
   2.8.2026 ("Status: Suspended" a dashboard). Eg get ekki fullyrt hvad orsakadi
   thad, en tvennt i thessum koda var raunveruleg hætta og er nu lokad:
     (a) rannsakandi kallid var gert i HVERRI hradri keyrslu = 48/dag (lagad
         med geymslu, 7 daga TTL)
     (b) a leikdegi var glugginn opinn i 5 klst og hrada keyrslan gengur a 30
         min fresti, svo SOMU byrjunarlidin voru sott allt ad 10 sinnum:
         60 koll a fjolmennasta GW1-degi, og 110 a 10-leikja midvikudegi
         — YFIR THAKI.
   Threnn vorn: geymsla per leik (sja fetchLineups), og THESSI hardi throskuldur
   sem notar `x-ratelimit-requests-remaining` sem API-id sendir sjalft. Vid
   hangum ekki a eigin talningu — vid hlustum a thjoninn.                  */
const API_MIN_REMAINING = 15;      // hættum thegar sva marg eru eftir
let apiRemaining = null, apiBlocked = null;
async function apiSports(path) {
  if (apiBlocked) return { http: 0, blocked: apiBlocked, errors: { budget: apiBlocked }, response: [] };
  if (apiRemaining != null && apiRemaining <= API_MIN_REMAINING) {
    apiBlocked = `quota nearly spent (${apiRemaining} left) — stopped before the tier closed it`;
    console.warn(`API-Sports: ${apiBlocked}`);
    return { http: 0, blocked: apiBlocked, errors: { budget: apiBlocked }, response: [] };
  }
  const r = await fetch(`${APIS}${path}`, {
    headers: { "x-apisports-key": process.env.API_SPORTS_KEY, "User-Agent": UA },
    signal: AbortSignal.timeout(20000),
  });
  const j = await r.json();
  const rem = r.headers.get("x-ratelimit-requests-remaining");
  if (rem != null && Number.isFinite(+rem)) apiRemaining = +rem;
  return { http: r.status, remaining: rem, ...j };
}

async function fetchInjuries() {
  // hvaða þrep erum við á? (frítt kall)
  let plan = "?";
  try {
    const st = await apiSports("/status");
    /* HEILSA REIKNINGSINS ER NU SKRAD SEM SIN EIGIN HEIMILD.
       2.8.2026 var reikningurinn UPPSAGDUR og thad sast hvergi i vidmotinu:
       eina visbendingin var rannsakandi kall inni i api_lineups, og thad
       geymdi svarid — svo uppsognin var GRAEN i stodunni. `/status` svarar
       thessu DIREKT (threp + kvoti) og er kallad hvort sem er.
       `errors.access` / `errors.token` -> reikningurinn er i vandraedum og
       thad a ad SJAST, ekki alykta ut ur odru.                            */
    const acc = st.response?.subscription?.plan;
    const cur = st.response?.requests?.current, lim = st.response?.requests?.limit_day;
    const accErr = st.errors && !Array.isArray(st.errors)
      ? (st.errors.access || st.errors.token || Object.values(st.errors)[0]) : null;
    if (accErr) {
      plan = `ACCOUNT IN TROUBLE: ${String(accErr).slice(0, 90)}`;
      record("apisports_account", false, 0, plan);
    } else if (acc) {
      plan = `${acc} · ${cur}/${lim} calls today`;
      /* Vidvorun ADUR en kvotinn thrytur, ekki eftir. */
      const near = lim && cur != null && cur / lim > 0.8;
      record("apisports_account", true, cur ?? 0,
        `${acc} · ${cur}/${lim} calls today${near ? " — OVER 80% OF QUOTA" : ""}`);
    } else {
      plan = "response without tier information";
      record("apisports_account", false, 0, plan);
    }
    console.log(`API-Sports: ${plan}`);
  } catch (e) {
    console.warn("API-Sports /status:", e.message);
    record("apisports_account", false, 0, `/status failed: ${String(e.message).slice(0, 80)}`);
  }

  /* EMPÍRÍSKT MÆLT (keyrsla 2026-07-26): season=2026 er LÆST á fría
     þrepinu; date-leiðin virkar villulaust en `date` síar eftir LEIKDEGI
     leiksins sem meiðslin tengjast. Rétta spurningin er því um KOMANDI
     leikdaga — nákvæmlega dagana sem skipta máli fyrir frest-ákvarðanir.
     Við spyrjum um allt að 6 næstu leikdaga (úr fixtures.json) = ≤6 köll
     af 100 dagskvótanum. Season-leiðin er samt reynd fyrst svo uppfærsla
     í borgað þrep virki sjálfkrafa (1 kall í stað 6).                   */
  const errTxt = o => (o.errors && (Array.isArray(o.errors) ? o.errors.join("; ") : JSON.stringify(o.errors))) || "";
  const seasonYear = 2026;
  let d = await apiSports(`/injuries?league=39&season=${seasonYear}`);
  let via = `league+season=${seasonYear}`;
  if (!d.response?.length) {
    if (errTxt(d)) console.warn(`API-Sports injuries (${via}): ${errTxt(d)} — using the matchday route`);
    /* EMPÍRÍSKT MÆLT (keyrsla 2): fría þrepið leyfir aðeins ±1 DAGS
       glugga kringum daginn í dag ("try from <í gær> to <á morgun>").
       Við spyrjum því AÐEINS um leikdaga innan þess glugga — í reynd:
       daglega keyrslan grípur meiðslin fyrir leiki dagsins og morgun-
       dagsins, sem er nákvæmlega glugginn sem skiptir máli við frest.
       Fyrir tímabil er listinn eðlilega tómur (0 köll notuð).          */
    let dates = [];
    try {
      const fixtures = JSON.parse(await readFile(`${DATA}/fixtures.json`, "utf8"));
      const day = t => t.toISOString().slice(0, 10);
      const win = new Set([-1, 0, 1].map(o => day(new Date(Date.now() + o * 864e5))));
      dates = [...new Set(fixtures
        .filter(f => f.kickoff_time && !f.finished && win.has(f.kickoff_time.slice(0, 10)))
        .sort((a, b) => a.kickoff_time.localeCompare(b.kickoff_time))
        .map(f => f.kickoff_time.slice(0, 10)))];
    } catch {}
    const merged = []; const errs = [];
    for (const dt of dates) {
      const r = await apiSports(`/injuries?league=39&date=${dt}`);
      if (errTxt(r)) errs.push(`${dt}: ${errTxt(r)}`);
      merged.push(...(r.response || []));
      d = r;   // heldur remaining-hausnum af síðasta kalli
    }
    d = { ...d, response: merged };
    via = dates.length ? `match days ${dates.join(", ")} (${dates.length} calls)` : "no match days inside the free-tier window (±1 day)";
    if (errs.length && !merged.length) {
      await writeJSON("injuries.json", { updated: status.updated, plan, via,
        error: errs.join(" | ").slice(0, 200), players: [], unmatched: [] });
      record("apisports_injuries", false, 0, errs[0].slice(0, 70));
      return;
    }
  }

  // para API-nöfn við FPL-id: normalíserað fullt nafn + "F. Eftirnafn"
  // + web_name, ALLT skorðað við liðið (annars ranganir á algengum nöfnum)
  const { teamIdOf, unresolvedTeams, aliasCollisions, matchFpl } = await apiNameIndex();

  const out = [], unmatched = [];
  const seen = new Set();
  for (const it of (d.response || [])) {
    const teamId = teamIdOf(it.team?.name);
    const fplId = teamId ? matchFpl(it.player?.name, teamId) : null;
    const key = `${it.player?.id}|${it.fixture?.id}`;
    if (seen.has(key)) continue; seen.add(key);
    const rec = { name_api: it.player?.name, team_api: it.team?.name,
      type: it.player?.type ?? it.type ?? null,      // "Missing Fixture" / "Questionable"
      reason: it.player?.reason ?? it.reason ?? null, // "Knee Injury", "Illness"...
      fixture_date: it.fixture?.date ?? null };
    if (fplId) out.push({ fpl_id: fplId, ...rec });
    else unmatched.push(`${rec.name_api} (${rec.team_api})`);
  }
  await writeJSON("injuries.json", { updated: status.updated, plan, via,
    note: "Injury type and reason from API-Sports /injuries for upcoming matchdays. FPL status still governs availability; this ENRICHES it. In preseason (no matchdays ahead inside the window) the list is empty, as it should be. `unmatched` rows are expected to be non-zero: this source carries squad members FPL does not (academy, third keepers, departed), so a rate below 100% is the correct outcome — but `unresolved_teams` must always be empty, because a club name that does not resolve loses EVERY row for that club.",
    players: out, unmatched,
    unresolved_teams: [...unresolvedTeams], alias_collisions: aliasCollisions });
  /* "0 paraðir" er RETT utkoma fyrir timabil, ekki bilun — sja hlid 2 i
     kafla 6e i CLAUDE.md. Merkjum thad svo enginn fjarlaegi tenginguna
     a theim forsendum ad hun se brotin.
     HLUTFALLID ER NU I NOTUNNI, EKKI ADEINS TALNINGARNAR (21.8.2026):
     vordurinn i `tests/wiring.mjs` er um HLUTFALLID og "27 matched ·
     10 unmatched" thvingar lesandann til ad reikna thad sjalfur. Stadan a
     ad bera SOMU tolu sem vordurinn maelir. Oleyst LIDANOFN eru nefnd
     serstaklega thvi thau eru allt annad einkenni en oparad leikmannsnafn:
     eitt oleyst lidanafn fellir HVERJA rod thess lids i einu.            */
  const rate = out.length + unmatched.length
    ? ` (${(100 * out.length / (out.length + unmatched.length)).toFixed(1)}% matched)` : "";
  record("apisports_injuries", true, out.length,
    /* REGEXID VARD MUNADARLAUST VID ThYDINGUNA 9.8.2026: `via` var
       "leikdaga ..." en er nu "match days ...", svo /leikdag/i gat ALDREI
       passad og thessi grein var oaananleg. Skilabodin "RETT preseason-
       utkoma" birtust thvi aldrei — stadan sagdi "0 paradir" eins og bilun
       vaeri. Ordalag i regexi er sama gildra og ordalag i profi.        */
    out.length === 0 && /match day/i.test(via)
      ? `${via} — CORRECT preseason outcome, 0 calls used (first real test 20-21 August)`
      : `${via} · ${out.length} matched · ${unmatched.length} unmatched${rate} · ${d.remaining ?? "?"} calls left today`
        + (unresolvedTeams.size ? ` — CLUB NAMES UNRESOLVED: ${[...unresolvedTeams].join(", ")}` : "")
        + (aliasCollisions.length ? ` — ALIAS COLLISION: ${aliasCollisions.join("; ")}` : ""));
}

async function fetchOdds() {
  const key = process.env.ODDS_API_KEY;
  if (!key) { record("odds", false, 0, "ODDS_API_KEY missing"); return; }
  const gate = await shouldFetchOdds();
  console.log(`Odds gate: ${gate.go ? "FETCH" : "skip"} — ${gate.why}`);
  if (!gate.go) { record("odds", true, 0, `skipped: ${gate.why}`); return; }

  const url = `https://api.the-odds-api.com/v4/sports/soccer_epl/odds/?apiKey=${key}`
    + `&regions=uk&markets=h2h,totals,spreads&oddsFormat=decimal&dateFormat=iso`;
  const r = await fetchT(url, { headers: { "User-Agent": UA } });
  const remaining = r.headers.get("x-requests-remaining");
  const used = r.headers.get("x-requests-used");
  console.log(`Odds API: remaining=${remaining} used=${used}`);
  if (!r.ok) { record("odds", false, 0, `HTTP ${r.status}`); return; }
  const raw = await r.json();

  /* ============================================================
     HRAA SVARID ER GEYMT — ThAD ER OENDURHEIMTANLEGT (16.8.2026)

     Umbreytingin her ad nedan devig-ar allt nidur i FAA SKALARA per lid
     (cs/xg/xga/diff/lambda) og tekur ThRJA bokmakera af theim sem svara.
     ThAD SEM TAPAST VID ThAD ER EKKI HAEGT AD BYGGJA UPP AFTUR:
       · linu-HREYFING (opnun a moti lokun — vid sækjum tvisvar per umferd,
         i "plan"-glugga 6-8 daga fyrir og i "sharp"-glugga innan 36 klst)
       · MISRAEMI MILLI BOKA — hvar their eru osammala er einmitt thar sem
         markadslinan ber minnsta upplysingu
       · allir bokmakerar utan PREFERRED, og oll utkoma sem hvorki er h2h,
         totals ne spreads
     Og fria threpid hja the-odds-api hefur ENGAN sogulegan endapunkt: svarid
     sem vid hentum i dag er farid ad eilifu. Sama roksemd og `data/history/`
     og `data/predictions/` (CLAUDE.md 7).

     ThRJAR REGLUR — allar af sama meidi og 8e ("tom keyrsla ma aldrei
     thurrka ut god gogn"):
       1. NY, DAGSETT SKRA — EKKI inn i `odds.json`, sem er yfirskrifud i
          hverjum glugga. Arkiv sem er yfirskrifad er ekki arkiv.
       2. TOMT SVAR SKRIFAR EKKERT. Tom skra i arkivinu læsi eins og
          "bokmakerarnir birtu engar linur", sem er onnur fullyrding.
       3. SKRA SEM ER TIL ER ALDREI YFIRSKRIFUD (hlidin i `shouldFetchOdds`
          leyfa ekki tvaer soknir i sama glugga innan 30 klst, svo arekstur
          thydir ad eitthvad annad er ad — og tha er gamla myndin retthaerri).

     ARKIV, EKKI MERKI: ekkert i `src/` les thessa skra og markadslinan sem
     LIKANID notar kemur afram ur `odds.json` einni. Ad vira hraa svarid inn
     i FFDR, rodun eda radgjof krefst NYRRAR MAELINGAR fyrst (CLAUDE.md 3).
     Vordur: `tests/wiring.mjs` (kafli "ARKIV-SVID").

     OG ARKIVID MA ALDREI FELLA SOKNINA. Blokkin er i EIGIN try/catch: bresti
     skrifin (diskur, rettindi, hvad sem er) heldur `fetchOdds` afram og
     `odds.json` — sem LIKANID les — verdur til eins og adur. An thess vaeri
     ytra `catch` i `main()` buid ad skra `odds` sem BILADA og markadslidurinn
     dottinn ut ur FFDR af thvi ad GEYMSLA brast. Sama regla og
     `continue-on-error` a spa-bokhaldinu (CLAUDE.md 7): maelitaeki ma aldrei
     fella gagna-keyrsluna.
     ============================================================ */
  try {
    const nRaw = Array.isArray(raw) ? raw.length : 0;
    const day = status.updated.slice(0, 10);
    const win = gate.window || "unknown";
    const rel = `odds_raw/${day}-${win}.json`;
    if (!nRaw) {
      record("odds_raw", false, 0,
        "empty payload - nothing archived (an empty archive row would read as 'the books had no lines')");
    } else if (existsSync(`${DATA}/${rel}`)) {
      record("odds_raw", true, nRaw, `${rel} already exists - kept (an archive row is never rewritten)`);
    } else {
      await writeJSON(rel, {
        updated: status.updated, window: win, gw: gate.gw ?? null,
        requests_remaining: remaining ? +remaining : null,
        note: "RAW the-odds-api response, stored VERBATIM and never rewritten. Archive only - "
            + "nothing in the app reads it. Line movement, opening-vs-closing and per-book "
            + "disagreement cannot be reconstructed from odds.json, and the free tier has no "
            + "historical endpoint. Wiring any of it into the model requires a fresh measurement first.",
        response: raw,
      });
      record("odds_raw", true, nRaw, `${rel} · ${nRaw} matches archived verbatim`);
    }
  } catch (e) {
    record("odds_raw", false, 0, `archive failed: ${e.message} - odds.json itself is unaffected`);
  }

  // Nafnavörpun Odds API -> FPL short_name (normaliserað)
  const norm = s => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const byNorm = {};
  for (const [id, t] of Object.entries(teamsById)) {
    byNorm[norm(t.name)] = t.short_name;
    byNorm[norm(t.short_name)] = t.short_name;
    const LONG = {
      ARS:["Arsenal"], AVL:["Aston Villa"], BOU:["Bournemouth","AFC Bournemouth"],
      BRE:["Brentford"], BHA:["Brighton and Hove Albion","Brighton & Hove Albion","Brighton"],
      CHE:["Chelsea"], COV:["Coventry City","Coventry"], CRY:["Crystal Palace"],
      EVE:["Everton"], FUL:["Fulham"], HUL:["Hull City","Hull"],
      IPS:["Ipswich Town","Ipswich"], LEE:["Leeds United","Leeds"], LIV:["Liverpool"],
      MCI:["Manchester City","Man City"], MUN:["Manchester United","Man Utd","Man United"],
      NEW:["Newcastle United","Newcastle"], NFO:["Nottingham Forest","Nott'm Forest"],
      SUN:["Sunderland"], TOT:["Tottenham Hotspur","Tottenham","Spurs"],
    }[t.short_name] || [];
    LONG.forEach(n => byNorm[norm(n)] = t.short_name);
  }

  const PREFERRED = ["bet365", "williamhill", "betfair_ex_uk", "skybet", "paddypower"];
  const teams = {};
  const unmatched = new Set();
  let games = 0;

  for (const g of (raw || [])) {
    const books = (g.bookmakers || []).filter(b =>
      b.markets?.some(m => m.key === "h2h") && b.markets?.some(m => m.key === "totals"));
    const pick = books.sort((a, b) =>
      (PREFERRED.indexOf(a.key) + 1 || 99) - (PREFERRED.indexOf(b.key) + 1 || 99)).slice(0, 3);
    if (!pick.length) continue;

    let totLine = 0, totOver = 0, totUnder = 0, totN = 0, hO = 0, dO = 0, aO = 0, n = 0;
    let ahPoint = 0, ahN = 0;
    for (const b of pick) {
      const h2h = b.markets.find(m => m.key === "h2h");
      const tot = b.markets.find(m => m.key === "totals");
      if (h2h) {
        const ho = h2h.outcomes.find(o => o.name === g.home_team)?.price;
        const ao = h2h.outcomes.find(o => o.name === g.away_team)?.price;
        const dr = h2h.outcomes.find(o => o.name === "Draw")?.price;
        if (ho && ao && dr) { hO += ho; aO += ao; dO += dr; n++; }
      }
      if (tot) {
        const over = tot.outcomes.find(o => o.name === "Over");
        const under = tot.outcomes.find(o => o.name === "Under");
        if (over?.point && over?.price && under?.price) {
          totLine += over.point; totOver += over.price; totUnder += under.price; totN++;
        }
      }
      // SPREADS = asískt handicap. Punkturinn á heimaliðinu er handicap-ið.
      const spr = b.markets.find(m => m.key === "spreads");
      if (spr) {
        const hs = spr.outcomes.find(o => o.name === g.home_team);
        if (hs?.point != null) { ahPoint += hs.point; ahN++; }
      }
    }
    if (!n || !totN) continue;

    const p = devig(hO / n, dO / n, aO / n);
    // λ úr LÍKUM, ekki línunni sjálfri (línan er viðmið, ekki vænting)
    const line = totLine / totN;
    const pOver = devig2(totOver / totN, totUnder / totN);
    /* SAMEIGINLEGA UMBREYTINGIN (src/market.js) — asískt handicap notað
       þegar það er til (nákvæmara), annars 1X2-skipting. Spreads-punktur
       á heimaliði er +N þegar heimalið FÆR forgjöf.                      */
    const { hxg, axg, lambda, method } = marketGoals({
      pHome: p.home, pAway: p.away, line, pOver,
      ah: ahN ? ahPoint / ahN : null,
    });

    const hs = byNorm[norm(g.home_team)], as = byNorm[norm(g.away_team)];
    if (!hs) unmatched.add(g.home_team);
    if (!as) unmatched.add(g.away_team);
    if (!hs || !as) continue;
    games++;

    // LYKILATRIÐI: við geymum mótherja + kickoff svo framendinn geti staðfest
    // að línan gildi um RÉTTA leikinn (ekki notað á aðra umferð).
    // MARKAÐS-ÞYNGD (marketDiff) er á sama 1-5 kvarða sem framendinn notar.
    teams[hs] = { cs: poissonCleanSheet(axg), xga: +axg.toFixed(2), xg: +hxg.toFixed(2),
      diff: marketDiff(axg), opp: as, home: true, kickoff: g.commence_time,
      method, lambda: +lambda.toFixed(2), books: pick.map(b => b.title) };
    teams[as] = { cs: poissonCleanSheet(hxg), xga: +hxg.toFixed(2), xg: +axg.toFixed(2),
      diff: marketDiff(hxg), opp: hs, home: false, kickoff: g.commence_time,
      method, lambda: +lambda.toFixed(2), books: pick.map(b => b.title) };
  }
  if (unmatched.size) console.warn(`Odds: unmatched names: ${[...unmatched].join(" | ")}`);

  /* TOMT SVAR MA EKKI ThURRKA UT NYTILEGAR LINUR (8e).
     200-svar med ENGUM porudum leikjum (utan glugga, nofn breyttust, allir
     leikir bunir) skrifadi `teams: {}` OFAN A gluggann sem var thegar
     sottur — og markadslidurinn i FFDR datt ut thangad til naesta sokn
     tokst. Thad er nakvaemlega sama einkenni og thegar hann var DAUDUR I
     VIKU (CLAUDE.md 3): formulan i lagi, gognin sem hun fekk ekki.
     Se ekkert parad haldast fyrri linur og stadan segir fra thvi.       */
  if (!games) {
    let prev = null;
    try { prev = JSON.parse(await readFile(`${DATA}/odds.json`, "utf8")); } catch {}
    const kept = prev && prev.teams && Object.keys(prev.teams).length;
    record("odds", true, 0, kept
      ? `no matched games — KEEPING the previous window (${kept} teams, ${prev.updated})`
      : "no matched games and no previous file — odds.json not written");
    if (kept) return;                      // skrifum EKKI yfir god gogn
  }

  await writeJSON("odds.json", {
    updated: status.updated, window: gate.window || null, gw: gate.gw || null,
    requests_remaining: remaining ? +remaining : null,
    note: "CS% from a Poisson on the opponent's expected goals. 'opp' and 'kickoff' CONFIRM that the line refers to the right match.",
    teams,
  });
  record("odds", true, games, `${gate.window} · ${Object.keys(teams).length} teams · ${remaining} credits left`);
}

/* ========== HRAÐUR HAMUR (--fast) ==========
   Keyrt oft (á 30 mín). Sækir AÐEINS bootstrap og skrifar litla skrá með
   fljótandi sviðum: meiðsli, líkur á að spila, fréttir, verð, flutningar.
   Ástæða: FPL uppfærir meiðslafréttir allan daginn eftir fréttamannafundi.
   Full players.json er þung (400KB) — hún fer áfram í daglegu keyrsluna.
   ÞETTA KOSTAR EKKERT: GitHub Actions er frítt fyrir opinber repo.        */
async function fetchFast() {
  const bs = await getJSON(`${FPL}/bootstrap-static/`);
  const els = bs.elements || [];
  const events = bs.events || [];

  // aðeins það sem breytist innan dags
  const volatile = els
    .filter(e => e.status !== "a" || e.cost_change_event !== 0 || (e.news || "").trim())
    .map(e => ({
      id: e.id, status: e.status, news: e.news, news_added: e.news_added,
      chance_this: e.chance_of_playing_this_round,
      chance_next: e.chance_of_playing_next_round,
      now_cost: e.now_cost, cost_change_event: e.cost_change_event,
      transfers_in_event: e.transfers_in_event, transfers_out_event: e.transfers_out_event,
      selected_by_percent: e.selected_by_percent,
    }));

  // verðbreytingar í dag (allir, en aðeins 3 svið — létt)
  const prices = els
    .filter(e => e.cost_change_event !== 0)
    .map(e => ({ id: e.id, now_cost: e.now_cost, chg: e.cost_change_event }));

  const cur = events.find(e => e.is_current);
  const next = events.find(e => e.is_next);

  await writeJSON("news.json", {
    updated: new Date().toISOString(),
    current_gw: cur?.id ?? null, next_gw: next?.id ?? null,
    next_deadline: next?.deadline_time ?? null,
    note: "Volatile fields refreshed every 30 min. The front end layers this ON TOP OF players.json.",
    players: volatile, price_changes: prices,
  });

  // fixtures eru léttar og geta breyst (frestun, leiktímar)
  try {
    const fx = await getJSON(`${FPL}/fixtures/`);
    await writeJSON("fixtures.json", fx.map(f => ({
      id:f.id, event:f.event, kickoff_time:f.kickoff_time, finished:f.finished,
      started:f.started, minutes:f.minutes, finished_provisional:f.finished_provisional,
      team_h:f.team_h, team_a:f.team_a, team_h_score:f.team_h_score, team_a_score:f.team_a_score,
      team_h_difficulty:f.team_h_difficulty, team_a_difficulty:f.team_a_difficulty })));
  } catch (e) { console.warn(`fast fixtures: ${e.message}`); }

  /* STADFEST BYRJUNARLID TILHEYRIR HRADA KEYRSLUNNI, EKKI DAGLEGU.
     Thetta var MIN VILLA fyrst: eg tengdi fetchLineups adeins vid daglegu
     keyrsluna, sem gengur kl. 05 UTC. Leikir byrja 12-19 UTC, svo glugginn
     (leikur innan 2 klst) hefdi NANAST ALDREI opnast og eiginleikinn hefdi
     verid daudur kodi sem virtist virka. 30-minutna keyrslan er einmitt su
     sem naer lidunum 40-60 min fyrir leik — sja CLAUDE.md kafla 7.1.
     Utan gluggans kostar thetta 1 kall (rannsokn) eda 0.               */
  if (FLAGS.apisports) {
    try { await fetchLineups(); }
    catch (e) { record("api_lineups", false, 0, e.message); }
  }

  /* BSD-SPA UM BYRJUNARLID TILHEYRIR LIKA HRADA KEYRSLUNNI, OG HER ER
     ASTAEDA SEM GILDIR UM ENGA ADRA HEIMILD I ThESSU REPO-I:
     **SPAIN ER EKKI GEYMD AFTURVIRKT.** Maelt 8.8.2026 — leikur sem er
     BUINN skilar `lineup_status: "confirmed"`, ekki thvi sem spad var
     ADUR. Spa sem er ekki soft fyrir leik er thvi TOPUD AD EILIFU.
     Glugginn maeldist ~11-13 klst fyrir leik (14 af 14 Carabao-leikjum
     a T+11-13 voru `predicted`, allt utan thess `unavailable`).
     Vid GEYMUM hana svo haegt se ad MAELA hana sidar gegn okkar eigin
     6h-likani — hun er ekki notud i neinni akvordun fyrr en hun hefur
     verid maeld, sbr. regluna i kafla 3.                              */
  if (FLAGS.bsd) {
    try { await fetchBsdLineups(); }
    catch (e) { record("bsd_lineups", false, 0, e.message); }
    try { await fetchBsdOdds(); }
    catch (e) { record("bsd_odds", false, 0, e.message); }
  }

  /* SERFRAEDINGA-HOPURINN ("Best of the best") TILHEYRIR HRADA KEYRSLUNNI AF
     SOMU ASTAEDU OG BYRJUNARLIDIN: daglega keyrslan gengur kl. 05 UTC en
     frestir eru 11-18 UTC, svo hun naedi umferdinni SOLARHRING of seint og
     notandinn vill sja kaupin um leid og umferdin opnar. Kvotavornin (hver
     umferd sott NAKVAEMLEGA EINU SINNI) er inni i collectPros, ekki i cron.  */
  try {
    await collectPros({ getJSON, writeJSON, record,
      readJSON: async f => JSON.parse(await readFile(`${DATA}/${f}`, "utf8")) }, events, els);
  } catch (e) { record("pros", false, 0, e.message); }

  console.log(`FAST: ${volatile.length} players with news/doubt/price change, ${prices.length} price changes`);
  record("fast_news", true, volatile.length, `${prices.length} price changes`);
  await writeJSON("status_fast.json", status);
}

/* ========== BSD (sports.bzzoiro.com) ==========
   Okeypis, enginn kvoti (maelt 8.8.2026). Uppsofnunin sjalf er i
   `src/bsd.js` — HREIN og profud — svo pipeline og handvirka skriftan
   `scripts/fetch-bsd.mjs` reikni NAKVAEMLEGA thad sama. Tvaer utfaerslur
   myndu thyda ad lokna timabilid og thad lifandi gaetu rekid i sundur an
   thess ad nokkurt prof felli (sama rok og `market.js`, kafli 1).      */
const BSD_API = "https://sports.bzzoiro.com/api/v2";
const BSD_LEAGUE = 1;                    // Premier League
/* HANDSTADFEST lidatafla — athugasemdin her sagdi sjalf "sama og i
   scripts/fetch-bsd.mjs", og thad var ThRIDJA afritid. Flutt i `src/bsd.js`
   11.8.2026; `BSD_TEAM_SHORT` er nu bara staðbundid heiti a henni svo
   kallstadirnir nedar (2093, 2106) haldist obreyttir.                   */
const BSD_TEAM_SHORT = BSD_TEAM;
async function bsdGet(path) {
  const r = await fetch(BSD_API + path, {
    headers: { Authorization: `Token ${process.env.BSD_KEY}`, "user-agent": "fantasy-tool" },
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) {
    /* SVARBOLURINN FYLGIR MED — HANN BAR SVARID ALLAN TIMANN (19.8.2026).
       BSD fell med `BSD HTTP 400 /leagues/1/seasons/?limit=5` i fjora daga
       og su lina segir EKKERT um hvad var ad. Bolurinn sagdi thad hins
       vegar berum ordum:
         {"detail":"Unknown query parameter(s): limit.",
          "unknown_parameters":["limit"], "accepted_parameters":[]}
       Vid hentum honum. Sama aett og elo-sokni sem sagdi eitt ord
       ("timeout"): stadan a ad bera MUNSTRID, ekki adeins toluna.      */
    let body = "";
    try { body = (await r.text()).slice(0, 180); } catch { /* thogult */ }
    throw new Error(`BSD HTTP ${r.status} ${path}${body ? " — " + body : ""}`);
  }
  return r.json();
}
/* Leikir yfirstandandi timabils. `is_current` er lesid ur BSD sjalfu svo
   timabils-id se ekki hardkodad — thad breytist arlega.                */
async function bsdCurrentSeason() {
  /* `?limit=5` VAR FJARLAEGT 19.8.2026 — BSD haetti ad taka vid thvi.
     Endapunkturinn svarar nu 400 med `accepted_parameters: []`, thea hann
     tekur ENGA fyrirspurnar-breytu. Fallid brast thvi a hverri keyrslu fra
     adfaranott 18.8. og tok `bsd_live`, `bsd_lineups` og `bsd_odds` med
     ser. ATH: `/events/` tekur `limit` AFRAM (profad: 30, 200+offset og
     an hennar skila oll 200), svo thetta er endapunkts-bundid en ekki
     almenn breyting — ekki fjarlaegja `limit` annars stadar.
     Skrain skilar ollum 35 timabilum og `is_current` finnst aframhaldandi. */
  const d = await bsdGet(`/leagues/${BSD_LEAGUE}/seasons/`);
  const cur = (d.seasons || []).find(s => s.is_current) || (d.seasons || [])[0];
  return cur?.id ?? null;
}

/* ---- SPAD BYRJUNARLID — GEYMT, EKKI NOTAD ----
   Spain er EKKI geymd afturvirkt hja BSD: leikur sem er buinn skilar
   `confirmed`, ekki thvi sem spad var. Spa sem er ekki soft fyrir leik
   er thvi TOPUD AD EILIFU. Thess vegna er hun geymd hér strax — EN hun
   fer i ENGA akvordun fyrr en hun hefur verid maeld gegn 6h-likaninu
   yfir GW1-4 (sama regla og allt annad i kafla 3).                    */
async function fetchBsdLineups() {
  const season = await bsdCurrentSeason();
  if (!season) { record("bsd_lineups", true, 0, "no season"); return; }
  const d = await bsdGet(`/events/?league_id=${BSD_LEAGUE}&season_id=${season}&status=notstarted&limit=30`);
  const now = Date.now();
  /* Adeins leikir innan 24 klst — glugginn maeldist ~11-13 klst, svo
     vidara en thad er hreint soun a kollum.                           */
  const soon = (d.results || []).filter(e => {
    const t = Date.parse(e.event_date);
    return Number.isFinite(t) && t > now && t - now < 24 * 3600e3;
  });
  if (!soon.length) {
    record("bsd_lineups", true, 0, "no matches within 24h (the prediction window is ~13h)");
    return;
  }
  /* VID SKRIFUM OFAN A, EKKI YFIR: fyrri spar mega ekki tapast, thvi
     thaer eru einmitt thad sem a ad maela sidar.                      */
  let prev = {};
  try { prev = JSON.parse(await readFile(`${DATA}/bsd_lineups.json`, "utf8")).events || {}; }
  catch { /* fyrsta keyrsla */ }
  let got = 0;
  for (const e of soon) {
    try {
      const lu = await bsdGet(`/events/${e.id}/lineups/`);
      if (lu.lineup_status === "unavailable") continue;
      const before = (prev[String(e.id)]?.snapshots || []).length;
      prev = mergeLineupSnapshot(prev, {
        eventId: e.id, fixture: `${e.home_team} v ${e.away_team}`,
        kickoff: e.event_date, status: lu.lineup_status,
        at: new Date().toISOString(),
        lineups: { home: sideOf(lu.lineups?.home), away: sideOf(lu.lineups?.away) },
      });
      if ((prev[String(e.id)].snapshots || []).length > before) got++;
    } catch (err) { console.warn(`bsd lineup ${e.id}: ${err.message}`); }
  }
  await writeJSON("bsd_lineups.json", {
    updated: new Date().toISOString(), season_id: season,
    note: "PREDICTED line-ups from BSD, kept FOR MEASUREMENT — used in no "
        + "decision. The prediction is not stored retroactively (finished matches return "
        + "'confirmed'), so it is lost unless fetched before kick-off. "
        + "The window measured at ~11-13h before kick-off. `ai_score` is their "
        + "own model and has NOT been measured against our 6h model.",
    events: prev,
  });
  record("bsd_lineups", true, got, `${soon.length} matches in window, ${got} new shots`);
}
/* Adeins thad sem tharf til maelingar: hver atti ad byrja og med hvada
   oryggi. Bekkurinn er 24-33 manns hja BSD og segir ekkert.           */
function sideOf(s) {
  if (!s) return null;
  return {
    team: s.team_name, formation: s.formation, confidence: s.confidence,
    xi: (s.players || []).map(p => ({ n: p.name, pos: p.position, ai: p.ai_score })),
  };
}

/* ---- MARKADSLINA UR BSD — VARALEID VID ODDS-API ----
   Hun er VARALEID, ekki utskipting: Odds-API er ohreyfd og BSD skrifar i
   SINA skra. Astaedan er kafli 3 — markadslinan er staersta validerada
   merkid i verkefninu, svo hun ma ekki hanga a einni heimild sem er ny
   og oreynd. `odds.json` heldur forgangi; thetta er thad sem gripur ef
   kvotinn (456 koll eftir) klarast eda heimildin dettur.

   ENGIN NY STAERDFRAEDI: BSD hefur ENGAN asiskan forgjafar-markad, en
   `marketGoals()` i `src/market.js` hefur ThEGAR leid an hans
   (`totals+h2h` gegnum `splitGoals`). Su leid var MAELD 8.8.2026 a 2.658
   E0-leikjum gegn raunverulegum morkum: r(heima) 0,3958 a moti 0,3950
   fyrir spread-leidina, MAE 0,9194 a moti 0,9206 — ThAD ER JAFNGOTT.
   Poisson-lausn var lika profud (r 0,3965) og er 0,001 fra — su vidbot
   var thvi MAELD OG SLEPPT sem suð.                                    */
async function fetchBsdOdds() {
  const season = await bsdCurrentSeason();
  if (!season) { record("bsd_odds", true, 0, "no season"); return; }
  const d = await bsdGet(`/events/?league_id=${BSD_LEAGUE}&season_id=${season}&status=notstarted&limit=20`);
  const out = {};
  let priced = 0;
  for (const e of (d.results || [])) {
    let o;
    try { o = await bsdGet(`/events/${e.id}/odds/`); }
    catch { continue; }
    const q = o?.odds || {};
    if (q.home_win == null || q.over_25_goals == null) continue;
    priced++;
    out[String(e.id)] = {
      fixture: `${e.home_team} v ${e.away_team}`, kickoff: e.event_date,
      home_win: q.home_win, draw: q.draw, away_win: q.away_win,
      over_25: q.over_25_goals, under_25: q.under_25_goals,
    };
  }
  await writeJSON("bsd_odds.json", {
    updated: new Date().toISOString(), season_id: season,
    note: "A FALLBACK for odds.json (Odds-API), not a replacement. BSD has "
        + "NO Asian handicap market, so the line is computed through the "
        + "marketGoals() 'totals+h2h' route — MEASURED as good as the spread route "
        + "over 2,658 E0 matches (r 0.3958 against 0.3950). BSD odds only reach "
        + "~4 days ahead, so the file is empty outside that window and that is CORRECT.",
    events: out,
  });
  record("bsd_odds", true, priced,
         priced ? `${priced} matches priced` : "no matches within the ~4 day odds window");
}

/* ---- YFIRSTANDANDI TIMABIL: BSD-LEIKMANNATOLUR ----
   `bsd_players.json` er FROSID 2025/26 (handvirk skrifta, lokid timabil).
   An thessa yrdu allir BSD-dalkarnir tomir um leid og notandinn velur
   2026/27 — th.e. um leid og timabilid byrjar, sem er thegar their skipta
   mestu mali. Thetta fall heldur theim lifandi.

   VIÐBOTARLEGT, EKKI ENDURREIKNAD. Leikur sem er buinn breytist ekki, svo
   adeins NYIR loknir leikir eru sottir og lagdir vid uppsafnadar summur.
   Fyrsta utgafan endurreiknadi allt timabilid daglega: 760 koll og ~3 min
   i hverri keyrslu i mai, fyrir gogn sem hofdu ekki breyst. Nu eru thetta
   ~20 koll a viku.

   ThAD ThYDIR AD SUMMURNAR SJALFAR ERU GEYMDAR (`_acc`) — finalize() er
   ekki vixlanlegt (xg_per_shot er hlutfall), svo ekki er haegt ad leggja
   BIRTU rodina vid nyjan leik. Appid les `players`/`shots` og hunsar `_acc`.

   TOM KEYRSLA MA ALDREI ThURRKA UT GOD GOGN: se ekkert nytt, er skrain
   latin OSNERT. Se hun til fyrir ANNAD timabil (arsskipti) er byrjad upp
   a nytt — annars vaeru tvo timabil lögd saman i eina tolu.            */
async function fetchBsdLive() {
  const season = await bsdCurrentSeason();
  if (!season) { record("bsd_live", true, 0, "no season"); return; }

  let prev = { season_id: null, events: [], acc: {}, shots: [], positions: {} };
  try {
    const f = JSON.parse(await readFile(`${DATA}/bsd_live.json`, "utf8"));
    if (f.season_id === season) prev = { ...prev, ...f, acc: f._acc || {} };
  } catch { /* fyrsta keyrsla */ }

  const evs = [];
  for (const off of [0, 200]) {
    const d = await bsdGet(`/events/?league_id=${BSD_LEAGUE}&season_id=${season}&limit=200&offset=${off}`);
    evs.push(...(d.results || []));
    if ((d.results || []).length < 200) break;
  }
  const done = new Set(prev.events || []);
  const fresh = evs.filter(e => e.status === "finished" && !done.has(e.id))
                   .sort((a, b) => a.id - b.id);          // FOST rod — sbr. fleytitolur
  if (!fresh.length) {
    record("bsd_live", true, (prev.events || []).length,
           `${(prev.events || []).length} matches ingested — nothing new`);
    return;
  }

  const acc = {};                                          // bsd id -> accumulator
  for (const [k, v] of Object.entries(prev.acc || {})) acc[k] = { ...v, teams: new Map(v.teams || []) };
  const P = id => (acc[id] ||= newAcc());
  /* `shots` VAR HER OG VAR ALLTAF TOMT — sja notuna i skrifunum ad nedan. */
  const positions = { ...(prev.positions || {}) };
  let added = 0;

  for (const e of fresh) {
    let ps, st;
    try {
      [ps, st] = await Promise.all([
        bsdGet(`/events/${e.id}/player-stats/`),
        bsdGet(`/events/${e.id}/stats/`),
      ]);
    } catch (err) { console.warn(`bsd live ${e.id}: ${err.message}`); continue; }
    for (const r of (ps?.player_stats || [])) addPlayerRow(P(r.player_id), r);
    for (const sh of (st?.shotmap || [])) {
      if (sh.player_id == null) continue;
      addShot(P(sh.player_id), sh);
    }
    for (const side of ["home", "away"])
      for (const r of ((st?.average_positions || {})[side] || [])) {
        if (r?.player_id == null || typeof r.x !== "number" || typeof r.y !== "number") continue;
        (positions[r.player_id] ||= []).push([+r.x.toFixed(1), +r.y.toFixed(1)]);
      }
    done.add(e.id); added++;
  }
  if (!added) { record("bsd_live", false, 0, "no match could be fetched"); return; }

  /* PORUN VID FPL — a lifandi timabili er BSD-lidid = lid dagsins, svo
     nafn + lid dugar (engin sumarglugga-skekkja, sbr. imminent).       */
  const [pl, tm] = await Promise.all([
    readFile(`${DATA}/players.json`, "utf8").then(t => JSON.parse(t).players || []).catch(() => []),
    readFile(`${DATA}/teams.json`, "utf8").then(t => JSON.parse(t).teams || []).catch(() => []),
  ]);
  const byShort = Object.fromEntries(tm.map(t => [t.short, t]));
  const byTeamId = {};
  for (const p of pl) (byTeamId[p.team] ||= []).push(p);
  const names = new Map();
  for (const id of Object.keys(acc)) {
    try { const m = await bsdGet(`/players/${id}/`); names.set(+id, m); } catch { /* nafnlaus */ }
  }
  const cands = [];
  for (const [id, o] of Object.entries(acc)) {
    resolveTeam(o);
    const short = BSD_TEAM_SHORT[o.team_id];
    const ft = short ? byShort[short] : null;
    const m = names.get(+id);
    if (!ft || !m) continue;
    cands.push({ bsd_id: +id, name: m.name, short_name: m.short_name, pos: m.position,
                 minutes: o.minutes_played, pool: byTeamId[ft.id] || [] });
  }
  const pairs = pairPlayers(cands);
  const players = [];
  for (const [id, o] of Object.entries(acc)) {
    const fp = pairs.get(+id);
    if (!fp) continue;
    players.push(finalize(o, { bsd_id: +id, name: names.get(+id)?.name, pos: names.get(+id)?.position,
                               team: BSD_TEAM_SHORT[o.team_id] || null, fpl_id: fp.id, code: fp.code }));
  }
  players.sort((a, b) => (b.minutes || 0) - (a.minutes || 0) || (a.bsd_id - b.bsd_id));

  const label = await seasonLabelFromEvents();
  await writeJSON("bsd_live.json", {
    updated: status.updated, source: "bsd_v2_live", season_id: season, season: label,
    /* NOTAN LOFADI SVIDI SEM VAR ALLTAF TOMT (leidrett 14.8.2026).
       Her stod "The app reads `players`/`shots`" — en `shots` var skrifad `[]`
       i hverri keyrslu: hvergi i skriftunni er `shots.push`, skotin fara i
       `addShot(...)` inni i safnaranum, og appid les skotakort ur
       `bsd_shots.json`. Svidid var thvi hvorki fyllt ne lesid.
       Nota sem lofar sviði sem er tomt er verri en engin nota: hun laetur
       tomt svid lita ut eins og "engin skot i thessari umferd".
       Svidid er FJARLAEGT fremur en fyllt — skotakortin eiga sina eigin
       skra og tvitekin gogn geta rekid i sundur (CLAUDE.md 6, "EIN rod per
       skot, ekki thrjar").                                              */
    note: "Current season from BSD, INCREMENTAL: only newly finished matches are "
        + "fetched and added to the accumulated totals (`_acc`). Same formulas as "
        + "bsd_players.json — both use src/bsd.js. The app reads `players`. "
        + "Shot maps live in bsd_shots.json, not here.",
    matches: done.size,
    events: [...done].sort((a, b) => a - b),
    players, positions,
    _acc: Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, { ...v, teams: [...v.teams] }])),
  });
  record("bsd_live", true, players.length,
         `${done.size} matches (${added} new) · ${players.length} players matched`);
}

/* ========== 10. AFLEIDD LÖG — engin ný köll, engir kvótar ==========
   Allt hér er reiknað úr gögnum sem eru ÞEGAR sótt. Kostar ekkert.
   Hvert lag í sínu try/catch og telur raðir í status.json.              */

const LONG_TRIP_KM = 300;   // þröskuldur fyrir "long trip"

// Haversine — fjarlægð milli leikvanga í km
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371, toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

/* ---- 5. FERÐALENGD ----
   Hnitin eru þegar í teams_map.json (sótt fyrir veðrið). Sama borð gefur
   ferðalengd útiliðsins — breyta sem nánast enginn reiknar.              */
async function deriveTravel() {
  const fixtures = JSON.parse(await readFile(`${DATA}/fixtures.json`, "utf8"));
  const tmap = JSON.parse(await readFile(`${DATA}/teams_map.json`, "utf8"));
  const out = [];
  let missing = 0;
  for (const f of fixtures) {
    const h = tmap[f.team_h], a = tmap[f.team_a];
    if (!h?.lat || !a?.lat) { missing++; continue; }
    const km = haversineKm(a.lat, a.lon, h.lat, h.lon);
    out.push({
      fixture_id: f.id, event: f.event, kickoff_time: f.kickoff_time,
      home_fpl_id: f.team_h, away_fpl_id: f.team_a,
      km, is_long_trip: km > LONG_TRIP_KM,
    });
  }
  if (missing) console.warn(`Travel: ${missing} matches without coordinates`);
  await writeJSON("travel.json", {
    updated: status.updated, long_trip_km: LONG_TRIP_KM,
    note: "km = haversine between stadiums. Applies to the AWAY SIDE (away_fpl_id).",
    fixtures: out,
  });
  const longs = out.filter(x => x.is_long_trip).length;
  record("travel", true, out.length, `${longs} long trips (>${LONG_TRIP_KM} km)`);
}

/* ---- 6. UMFERÐAFORM: auðar og tvöfaldar umferðir ----
   Leitt úr fixtures.json. Lið með 0 leiki = auð umferð, 2+ = tvöföld.
   ATH SEM ER OFT MISSKILIN: lið sem fer ÚR bikar snemma fær TRYGGARI
   mínútur, ekki verri — þess vegna cup_exited-sviðið.                    */
async function deriveGameweekShape() {
  const fixtures = JSON.parse(await readFile(`${DATA}/fixtures.json`, "utf8"));
  const teams = JSON.parse(await readFile(`${DATA}/teams.json`, "utf8")).teams;
  const events = JSON.parse(await readFile(`${DATA}/events.json`, "utf8")).events;
  // bikarleikir (úr euro_fixtures.json ef til) til að meta cup_exited
  let extra = {};
  try {
    const eu = JSON.parse(await readFile(`${DATA}/euro_fixtures.json`, "utf8"));
    extra = eu.by_team || {};
  } catch {}

  const count = {};
  fixtures.forEach(f => {
    if (!f.event) return;
    [f.team_h, f.team_a].forEach(t => {
      count[t] = count[t] || {};
      count[t][f.event] = (count[t][f.event] || 0) + 1;
    });
  });

  const shape = events.map(ev => {
    const playing = [], blanks = [], doubles = [];
    teams.forEach(t => {
      const n = count[t.id]?.[ev.id] || 0;
      if (n === 0) blanks.push(t.id);
      else { playing.push(t.id); if (n >= 2) doubles.push(t.id); }
    });
    return { event: ev.id, teams_playing: playing, blanks, doubles };
  });

  // cup_exited: lið sem hafa ENGA bikar-/Evrópuleiki skráða framvegis.
  // Fyrir tímabil er þetta óþekkt — merkjum null, ekki false (ekki ljúga).
  const anyExtra = Object.keys(extra).length > 0;
  const cupStatus = {};
  teams.forEach(t => {
    const games = extra[t.id] || extra[String(t.id)] || [];
    cupStatus[t.id] = anyExtra ? { extra_games: games.length, cup_exited: games.length === 0 }
                               : { extra_games: 0, cup_exited: null };
  });

  await writeJSON("gameweek_shape.json", {
    updated: status.updated,
    note: "blanks = clubs with 0 matches in a gameweek, doubles = 2+. cup_exited null = unknown (cups not yet drawn).",
    cup_status: cupStatus, shape,
  });
  const nB = shape.reduce((a, s) => a + s.blanks.length, 0);
  const nD = shape.reduce((a, s) => a + s.doubles.length, 0);
  record("gameweek_shape", true, shape.length, `${nB} blanks, ${nD} doubles`);
}

/* ---- 1b. HVÍLDARDAGAR ----
   rest_days úr KICKOFF-TÍMA (ekki dagsetningu eingöngu), yfir ALLAR
   keppnir sem við höfum. euro_before/after fyllast þegar Evrópudráttur
   er gerður — þangað til eru þau false, sem er rétt (engir leikir skráðir).

   „<4 DAGA HVÍLD"-FLAGGIÐ VAR TEKIÐ ÚT 29.7.2026 — MÆLT ÓNÝTT.
   Það var talið í status og las eins og rótasjón-hætta. Mæling á 65.557
   leikmanna-umferðum (3 tímabil): eftir <4 daga hvíld spila 27,0% af
   leikmönnum 60+ mínútur, á móti 27,3% annars (10.448 leikir með skammri
   hvíld). Það er EKKERT forspárgildi um mínútur, svo talan mátti ekki
   birtast við hlið raunverulegra hættu-merkja.
   `rest_days` sjálft er GEYMT sem UPPLÝSING — sama regla og ferðalengd
   (kafli 3 í CLAUDE.md): mælt ómarktækt => birt, ekki vegið. */
async function deriveRotation() {
  const fixtures = JSON.parse(await readFile(`${DATA}/fixtures.json`, "utf8"));
  const teams = JSON.parse(await readFile(`${DATA}/teams.json`, "utf8")).teams;
  let extra = {};
  try {
    const eu = JSON.parse(await readFile(`${DATA}/euro_fixtures.json`, "utf8"));
    extra = eu.by_team || {};
  } catch {}

  const out = [];
  for (const t of teams) {
    // allir leikir liðsins: deild + Evrópa/bikar, tímaraðaðir
    const pl = fixtures
      .filter(f => (f.team_h === t.id || f.team_a === t.id) && f.kickoff_time)
      .map(f => ({ when: new Date(f.kickoff_time), event: f.event, comp: "PL" }));
    const ex = (extra[t.id] || extra[String(t.id)] || [])
      .filter(x => x.date)
      .map(x => ({ when: new Date(x.date), event: null, comp: x.comp_label || x.comp }));
    const all = [...pl, ...ex].sort((a, b) => a.when - b.when);

    for (let i = 0; i < all.length; i++) {
      const g = all[i];
      if (g.comp !== "PL" || !g.event) continue;      // aðeins PL-umferðir
      const prev = all[i - 1];
      const next = all[i + 1];
      const dayDiff = (x, y) => Math.round((y - x) / 86400000 * 10) / 10;
      const restDays = prev ? dayDiff(prev.when, g.when) : null;
      const beforeGap = prev && prev.comp !== "PL" ? dayDiff(prev.when, g.when) : null;
      const afterGap = next && next.comp !== "PL" ? dayDiff(g.when, next.when) : null;
      out.push({
        fpl_id: t.id, event: g.event, kickoff_time: g.when.toISOString(),
        rest_days: restDays,
        euro_before: beforeGap != null && beforeGap >= 2 && beforeGap <= 4,
        euro_after: afterGap != null && afterGap >= 2 && afterGap <= 4,
        euro_competition: (beforeGap != null && beforeGap <= 4) ? prev.comp
                        : (afterGap != null && afterGap <= 4) ? next.comp : null,
      });
    }
  }
  const flagged = out.filter(x => x.euro_before || x.euro_after).length;
  await writeJSON("rotation.json", {
    updated: status.updated,
    note: "rest_days = days since the club's LAST match in any competition (from kickoff_time). euro_before/after = a European or cup match 2-4 days before/after.",
    /* Mælt 29.7.2026: hvíld hefur ekkert forspárgildi um mínútur (27,0% á
       móti 27,3% spila 60+ eftir <4 daga hvíld, n=10.448). Talningin var
       tekin úr status svo hún lesist ekki sem hætta. Evrópu-nálægð er
       ÓMÆLD og heldur sér. */
    rest_measured: { short_rest_60plus: 0.270, other_60plus: 0.273,
                     samples: 10448, verdict: "no effect — not a warning sign" },
    rows: out,
  });
  record("rotation", true, out.length, `${flagged} with a European match nearby (rest measured useless, not flagged)`);
}

/* ---- 4b. HEPPNISMÆLIR ----
   TREVERK KEMUR NU UR BSD, EKKI UNDERSTAT (8.8.2026).
   Gamla utgafan las `data/understat/match/*.json` — mappa sem hefur ALDREI
   verid til hja okkur, thvi Understat fjarlaegdi skot-gognin ur HTML-inu
   (CLAUDE.md 6e). Lykkjan for thvi yfir NULL skrar i hverri keyrslu og
   `woodwork_for/against` voru fost a `null`. Skran sagdi sjalf "fyllist
   med skot-gognum" — sem gat ekki gerst.
   BSD skilar treverki sem EIGIN utkomu-tegund (`type: "post"`): 211 skot
   2025/26. Talan er thvi RAUNVERULEG i fyrsta sinn.                      */
/* `teamAgg` OG `playerAgg` VORU HER OG ERU FARIN (11.8.2026).
   Hvorugt var ALDREI skrifad i — greppad yfir allt fallid: `teamAgg` kom
   fyrir EINU SINNI (skilgreiningin) og `playerAgg` tvisvar (skilgreiningin
   og `Object.values(playerAgg)` i utskriftinni). `luck.json` hefur thvi
   skilad `players: []` fra fyrsta degi, og gerir thad i skranni sem er
   committud nuna.
   Their eru arfur ur Understat-tímanum: `players`-svidid i SCHEMA.md bar
   `understat_id`, `npxg`, `penalties_taken` … — svid ur heimild sem er
   HORFIN (CLAUDE.md 6e) og kemur ekki aftur. Ekkert i framendanum les
   `luck.players`.
   Svidid er thvi tekid ut i stad thess ad vera "fyllt sidar": tomt fylki
   sem lofar leikmanna-tolum er sama aett og daudur dalkur — thad les eins
   og eiginleiki sem bidur, en enginn er ad byggja hann.                 */
async function deriveLuck() {
  /* Lids-treverk ur bsd_shots.json. Skrain er lyklud a FPL-skammstofun i
     `legend.teams`, svo hvert skot veit HVER skaut og HVER fekk a sig.  */
  const wood = {};                                   // short -> { for, against }
  try {
    const bs = JSON.parse(await readFile(`${DATA}/bsd_shots.json`, "utf8"));
    const F = Object.fromEntries((bs.legend?.fields || []).map((f, i) => [f, i]));
    const iPost = (bs.legend?.type || []).indexOf("post");
    const names = bs.legend?.teams || [];
    for (const sh of (bs.shots || [])) {
      if (sh[F.type] !== iPost) continue;
      const t = names[sh[F.team]], o = names[sh[F.opp]];
      if (t) (wood[t] ||= { for: 0, against: 0 }).for++;
      if (o) (wood[o] ||= { for: 0, against: 0 }).against++;
    }
    console.log(`woodwork from BSD: ${Object.keys(wood).length} clubs`);
  } catch { /* skrain ma vanta — tha helst null, sem er RETT */ }

  // 2) LIÐ-STIG: mörk vs xG úr E0 (heilt) + xGC úr FPL-markverði
  const teams = JSON.parse(await readFile(`${DATA}/teams.json`, "utf8")).teams;
  const tmap = JSON.parse(await readFile(`${DATA}/teams_map.json`, "utf8"));
  const fd2fpl = {};
  Object.entries(tmap).forEach(([id, v]) => { if (v.fdcouk) fd2fpl[v.fdcouk] = Number(id); });
  let e0rows = [];
  try { e0rows = JSON.parse(await readFile(`${DATA}/fdcouk/E0-2526.json`, "utf8")).rows; } catch {}

  const e0 = {};
  for (const r of e0rows) {
    const pairs = [
      [r.HomeTeam, +r.FTHG || 0, +r.FTAG || 0],
      [r.AwayTeam, +r.FTAG || 0, +r.FTHG || 0],
    ];
    for (const [nm, gf, ga] of pairs) {
      const fid = fd2fpl[nm]; if (!fid) continue;
      const d = e0[fid] || (e0[fid] = { matches: 0, gf: 0, ga: 0 });
      d.matches++; d.gf += gf; d.ga += ga;
    }
  }
  // xG/xGC úr FPL (ATH: 19% vantar v. leikmanna sem fóru — merkjum það)
  const players = JSON.parse(await readFile(`${DATA}/players.json`, "utf8")).players;
  const fplAgg = {};
  players.forEach(p => {
    const a = fplAgg[p.team] || (fplAgg[p.team] = { xg: 0, gkMins: 0, xgc: 0 });
    a.xg += parseFloat(p.expected_goals || 0);
    if (p.element_type === 1 && (p.minutes || 0) > a.gkMins) {
      a.gkMins = p.minutes; a.xgc = parseFloat(p.expected_goals_conceded || 0);
    }
  });
  // nýliða-staðgengill
  let pb = {};
  try { pb = JSON.parse(await readFile(`${DATA}/promoted_baseline.json`, "utf8")); } catch {}

  const teamOut = teams.map(t => {
    const d = e0[t.id], f = fplAgg[t.id] || {};
    if (d) {
      return {
        fpl_id: t.id, short: t.short, matches: d.matches,
        goals: d.gf, conceded: d.ga,
        xg: +(f.xg || 0).toFixed(1), xgc: +(f.xgc || 0).toFixed(1),
        goals_minus_xg: f.xg ? +(d.gf - f.xg).toFixed(1) : null,
        conceded_minus_xgc: f.xgc ? +(d.ga - f.xgc).toFixed(1) : null,
        woodwork_for: wood[t.short]?.for ?? null,
        woodwork_against: wood[t.short]?.against ?? null,
        source: "e0+fpl",
        xg_incomplete: true,   // FPL-summa vantar leikmenn sem fóru úr deildinni
      };
    }
    // nýliðar án PL-sögu: B-deildar-staðgengill. STANGARSKOT ERU EKKI TIL -> null
    const key = t.name.replace(/ (City|Town|United)$/, "");
    const b = pb[key] || pb[t.name];
    return {
      fpl_id: t.id, short: t.short,
      matches: b?.games ?? null,
      goals: b ? Math.round(b.goals_pg * (b.games || 46)) : null,
      conceded: b ? Math.round(b.goals_against_pg * (b.games || 46)) : null,
      xg: null, xgc: null, goals_minus_xg: null, conceded_minus_xgc: null,
      woodwork_for: wood[t.short]?.for ?? null,        // null ef BSD vantar — EKKI 0
      woodwork_against: wood[t.short]?.against ?? null,
      source: b ? "championship_proxy" : "none",
      xg_incomplete: null,
    };
  });

  await writeJSON("luck.json", {
    updated: status.updated,
    note: "woodwork comes from the BSD shot map (its own outcome type 'post'), 2025/26 only. " +
          "goals from E0 (complete), xg from the FPL sum which is MISSING ~19% (players who left the league) " +
          "-> xg_incomplete:true. Promoted clubs and clubs without BSD data get woodwork null (NOT a zero).",
    teams: teamOut,
  });
  const withWood = teamOut.filter(t => t.woodwork_for != null).length;
  record("luck", true, teamOut.length,
    `${withWood} teams with woodwork from the BSD shot map`);
}

/* ---- 3b. LIÐ-FORM ÚR E0 — HEILT, engin vöntun ----
   FPL-summur vantar ~19% (leikmenn sem fóru úr deildinni eru fjarlægðir úr
   bootstrap). E0 hefur alla 380 leiki, svo lið-mælikvarðar héðan eru heilir.
   Framendinn á að nota ÞETTA fyrir lið-styrk, og FPL fyrir leikmanna-tölur.  */
async function deriveTeamForm() {
  const teams = JSON.parse(await readFile(`${DATA}/teams.json`, "utf8")).teams;
  const tmap = JSON.parse(await readFile(`${DATA}/teams_map.json`, "utf8"));
  const fd2fpl = {};
  Object.entries(tmap).forEach(([id, v]) => { if (v.fdcouk) fd2fpl[v.fdcouk] = Number(id); });
  let rows = [], header = [], rowsPrev = [];
  try {
    const j = JSON.parse(await readFile(`${DATA}/fdcouk/E0-2526.json`, "utf8"));
    rows = j.rows; header = j.header;
  } catch { record("team_form", false, 0, "E0-2526 missing"); return; }
  // FYRRA tímabil líka — MÆLING sýnir að 2-tímabila blöndun bætir miðjumanna-spá
  // um +0,014 í fylgni (45% vog á tímabilið á undan).
  try { rowsPrev = JSON.parse(await readFile(`${DATA}/fdcouk/E0-2425.json`, "utf8")).rows; } catch {}

  // REGLA: prenta raunverulega header-röð, ekki treysta lista
  console.log(`E0-2526 header (${header.length} columns): ${header.join(",")}`);

  const agg = {};
  for (const r of rows) {
    const sets = [
      [r.HomeTeam, true,  +r.FTHG||0, +r.FTAG||0, +r.HS||0, +r.AS||0, +r.HST||0, +r.AST||0, +r.HC||0, +r.HF||0, +r.HY||0, +r.HR||0],
      [r.AwayTeam, false, +r.FTAG||0, +r.FTHG||0, +r.AS||0, +r.HS||0, +r.AST||0, +r.HST||0, +r.AC||0, +r.AF||0, +r.AY||0, +r.AR||0],
    ];
    for (const [nm, home, gf, ga, sf, sa, stf, sta, cor, foul, yel, red] of sets) {
      const fid = fd2fpl[nm]; if (!fid) continue;
      const d = agg[fid] || (agg[fid] = { n:0, gf:0, ga:0, sf:0, sa:0, stf:0, sta:0, cor:0, foul:0, yel:0, red:0, cs:0, h:0 });
      d.n++; d.gf+=gf; d.ga+=ga; d.sf+=sf; d.sa+=sa; d.stf+=stf; d.sta+=sta;
      d.cor+=cor; d.foul+=foul; d.yel+=yel; d.red+=red;
      if (ga === 0) d.cs++;
      if (home) d.h++;
    }
  }
  // sama uppsöfnun fyrir fyrra tímabil
  const aggPrev = {};
  for (const r of rowsPrev) {
    const sets = [
      [r.HomeTeam, +r.FTHG||0, +r.FTAG||0, +r.HST||0, +r.AST||0],
      [r.AwayTeam, +r.FTAG||0, +r.FTHG||0, +r.AST||0, +r.HST||0],
    ];
    for (const [nm, gf, ga, stf, sta] of sets) {
      const fid = fd2fpl[nm]; if (!fid) continue;
      const d = aggPrev[fid] || (aggPrev[fid] = { n:0, gf:0, ga:0, stf:0, sta:0 });
      d.n++; d.gf+=gf; d.ga+=ga; d.stf+=stf; d.sta+=sta;
    }
  }

  const out = teams.map(t => {
    const d = agg[t.id];
    if (!d) return { fpl_id: t.id, short: t.short, matches: 0, source: "none" };
    const p = aggPrev[t.id];
    const per = v => +(v / d.n).toFixed(2);
    return {
      fpl_id: t.id, short: t.short, matches: d.n, source: "fdcouk_e0",
      goals_pg: per(d.gf), conceded_pg: per(d.ga),
      shots_pg: per(d.sf), shots_against_pg: per(d.sa),
      sot_pg: per(d.stf), sot_against_pg: per(d.sta),
      corners_pg: per(d.cor), fouls_pg: per(d.foul),
      yellows_pg: per(d.yel), reds_pg: +(d.red / d.n).toFixed(3),
      clean_sheet_pct: Math.round(d.cs / d.n * 100),
      conversion: d.sf ? +(d.gf / d.sf).toFixed(3) : null,
      sot_conversion: d.stf ? +(d.gf / d.stf).toFixed(3) : null,
      // fyrra tímabil (fyrir 2-tímabila blöndun í framenda)
      prev: p ? { matches: p.n, goals_pg: +(p.gf/p.n).toFixed(2), conceded_pg: +(p.ga/p.n).toFixed(2),
                  sot_pg: +(p.stf/p.n).toFixed(2), sot_against_pg: +(p.sta/p.n).toFixed(2) } : null,
    };
  });
  await writeJSON("team_form.json", {
    updated: status.updated, season: "2025-26", header_columns: header.length,
    note: "FROM E0, COMPLETE (380 matches). Use this for CLUB strength — FPL sums " +
          "are missing ~19% because players who left the league are removed from bootstrap.",
    teams: out,
  });
  const withData = out.filter(x => x.matches > 0).length;
  record("team_form", true, withData, `${out.length - withData} teams with no PL history (promoted)`);
}

/* ---- 7. RÚLLANDI EIGINLEIKAR — fyrir fittaða stigalíkanið ----
   Reiknað UMFERÐ FYRIR UMFERÐ úr live-gögnunum, ekki úr uppsöfnuðum
   minutes-sviðinu í players.json.
   MÆLT ÚT-AF-ÚRTAKI á 2025/26 (19.448 sýni): mins5 er RÍKJANDI þáttur
   (stöðluð áhrif +4,6 til +5,1 stig/5 umferðir). FDR mælist ~0.            */
async function deriveFormFeatures() {
  const events = JSON.parse(await readFile(`${DATA}/events.json`, "utf8")).events;
  const finished = events.filter(e => e.finished).map(e => e.id).sort((a, b) => a - b);
  if (!finished.length) {
    await writeJSON("form_features.json", {
      updated: status.updated, gws_used: 0, mode: "preseason",
      note: "No finished gameweeks — the fitted model needs ~5. The front end uses preseason mode.",
      players: [],
    });
    record("form_features", true, 0, "no finished gameweeks (preseason)");
    return;
  }
  // hlaða live-gögnum
  const perGw = {};
  for (const g of finished) {
    try {
      const d = JSON.parse(await readFile(`${DATA}/live/gw${g}.json`, "utf8"));
      perGw[g] = {};
      for (const el of (d.elements || [])) perGw[g][el.id] = el.stats || {};
    } catch {}
  }
  const gws = Object.keys(perGw).map(Number).sort((a, b) => a - b);
  const last5 = gws.slice(-5), last10 = gws.slice(-10);
  const ids = new Set();
  gws.forEach(g => Object.keys(perGw[g]).forEach(id => ids.add(+id)));

  const out = [];
  for (const id of ids) {
    const g5 = last5.map(g => perGw[g][id]).filter(Boolean);
    const g10 = last10.map(g => perGw[g][id]).filter(Boolean);
    if (!g5.length) continue;
    const mins5 = g5.reduce((a, s) => a + (s.minutes || 0), 0) / g5.length;
    const pts5  = g5.reduce((a, s) => a + (s.total_points || 0), 0) / g5.length;
    const starts5 = g5.reduce((a, s) => a + (s.starts || 0), 0) / g5.length;
    const tm = g10.reduce((a, s) => a + (s.minutes || 0), 0);
    const xgi90 = tm ? g10.reduce((a, s) => a + parseFloat(s.expected_goal_involvements || 0), 0) * 90 / tm : 0;
    const bps90 = tm ? g10.reduce((a, s) => a + (s.bps || 0), 0) * 90 / tm : 0;
    const dc90  = tm ? g10.reduce((a, s) => a + parseFloat(s.defensive_contribution || 0), 0) * 90 / tm : 0;
    const over60 = g5.filter(s => (s.minutes || 0) >= 60).length / g5.length;
    out.push({
      fpl_id: id,
      mins5: +mins5.toFixed(1), pts5: +pts5.toFixed(2),
      start_rate: +starts5.toFixed(2), over60_rate: +over60.toFixed(2),
      xgi90: +xgi90.toFixed(3), bps90: +bps90.toFixed(2), dc90: +dc90.toFixed(2),
      samples: g5.length, minutes_window: tm,
    });
  }
  await writeJSON("form_features.json", {
    updated: status.updated, gws_used: gws.length,
    window_5: last5, window_10: last10,
    mode: gws.length >= 5 ? "fitted" : "warmup",
    note: "Rolling features from live data, gameweek by gameweek. " +
          "mins5 is the dominant term by out-of-sample measurement (2025/26, 19,448 samples). " +
          "mode:'warmup' means fewer than 5 gameweeks — the front end should lower confidence.",
    players: out,
  });
  record("form_features", true, out.length, `${gws.length} gameweeks · mode=${gws.length >= 5 ? "fitted" : "warmup"}`);
}

/* ========== 12. UMFERDARSKYRSLA — data/last_gw.json ==========
   Ein SJALFSTAED skra fyrir flipann "Umferdin": sidasta LOKNA umferd,
   leikmenn + leikir + lida-tolur, alt uppleyst i nofn og stutt-kodun.

   AF HVERJU SJALFSTAED (ekki bara vísun i live/gw{n}.json): FPL endurnytir
   element-id milli timabila. Skyrsla fyrir 2025/26 sem vaeri pörud vid
   players.json 2026/27 eftir id myndi birta VITLAUS NOFN. Skrain berur
   thvi sin eigin nofn, stodur og lid.

   TVAER LEIDIR, sama utkomu-logun:
     (a) I TIMABILI — data/live/gw{n}.json (FPL) + fixtures.json + E0-2627.
     (b) FYRIR TIMABIL — engin lokin umferd i 2026/27 til. Tha er sidasta
         lokna umferdin GW38 2025/26. Hun kemur ur vaastav-speglun FPL-gagna
         (raw.githubusercontent.com — engin Cloudflare, enginn lykill) og
         lida-tolurnar ur E0-2526 sem vid hofum thegar staðbundid.
         MERKT archive:true svo framendinn ljugi ekki um artalid.

   MAELT 27.7.2026: porun speglunar-leikja vid E0-2526 gaf 10/10 i GW38.

   HVAD ER *EKKI* HER: skot-hnit, medalstadsetning, touches i teig,
   big chances, woodwork. Understat faerdi skot-gognin ur HTML-inu
   (leikjasidur skila adeins match_info; league-sidur byte-eins 18.645 b
   skel i 5/5 tilraunum, oll timabil) og speglunin hafdi ALDREI skotstig
   — adeins leikja-samantektir per leikmann — og stodvadist eftir 2024-25.
   FBref skilar 403. Thess vegna er hvergi latid sem svo ad thetta se til. */

const MIRROR = "https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data";
const ARCHIVE_SEASON = "2025-26";      // sidasta LOKNA timabilid
const POS_FROM_TYPE = { 1:"GK", 2:"DEF", 3:"MID", 4:"FWD" };

/* E0-leikir -> uppflettitafla a (dagsetning, heimalid, utilid) i fdcouk-nofnum. */
function e0Index(rows) {
  const idx = {};
  for (const m of rows || []) {
    const d = String(m.Date || "").split("/");
    if (d.length !== 3) continue;
    const iso = `${d[2].length === 2 ? "20" + d[2] : d[2]}-${d[1]}-${d[0]}`;
    idx[`${iso}|${m.HomeTeam}|${m.AwayTeam}`] = m;
  }
  return idx;
}
const e0Num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
function e0Stats(m) {
  if (!m) return null;
  return {
    shots_h: e0Num(m.HS), shots_a: e0Num(m.AS),
    sot_h: e0Num(m.HST),  sot_a: e0Num(m.AST),
    corners_h: e0Num(m.HC), corners_a: e0Num(m.AC),
    fouls_h: e0Num(m.HF),  fouls_a: e0Num(m.AF),
    yellow_h: e0Num(m.HY), yellow_a: e0Num(m.AY),
    red_h: e0Num(m.HR),    red_a: e0Num(m.AR),
    ht_h: e0Num(m.HTHG),   ht_a: e0Num(m.HTAG),
    referee: m.Referee || null,
  };
}

async function deriveLastGwReport() {
  const jread = async p => JSON.parse(await readFile(`${DATA}/${p}`, "utf8"));
  let events = [];
  try { events = (await jread("events.json")).events || []; } catch {}
  const finished = events.filter(e => e.finished).map(e => e.id);
  const curGw = finished.length ? Math.max(...finished) : null;

  if (curGw != null) {
    const built = await buildLiveGwReport(curGw);
    if (built) { record("last_gw", true, built.players.length, `GW${curGw} ${built.season} · ur live/gw${curGw}.json`); return; }
  }
  await buildArchiveGwReport();
}

/* ---- (a) I TIMABILI: ur okkar eigin live-skra ---- */
async function buildLiveGwReport(gw) {
  const jread = async p => JSON.parse(await readFile(`${DATA}/${p}`, "utf8"));
  let live, players, fixtures, teams;
  try {
    live     = await jread(`live/gw${gw}.json`);
    players  = (await jread("players.json")).players;
    fixtures = await jread("fixtures.json");
    teams    = (await jread("teams.json")).teams;
  } catch (e) { console.warn(`last_gw: the live route failed (${e.message}) — falling back to the archive`); return null; }
  if (!live?.elements?.length) return null;

  const tById = {}; teams.forEach(t => tById[t.id] = t);
  const pById = {}; players.forEach(p => pById[p.id] = p);
  const fxById = {}; fixtures.forEach(f => fxById[f.id] = f);

  let e0 = null;
  try { e0 = e0Index((await jread("fdcouk/E0-2627.json")).rows); } catch {}

  const gwFx = fixtures.filter(f => f.event === gw);
  const outFx = gwFx.map(f => {
    const h = tById[f.team_h], a = tById[f.team_a];
    const key = `${String(f.kickoff_time).slice(0,10)}|${NAMES[h?.short]?.fdcouk}|${NAMES[a?.short]?.fdcouk}`;
    return {
      id: f.id, h: h?.short || null, a: a?.short || null,
      h_score: f.team_h_score, a_score: f.team_a_score,
      kickoff: f.kickoff_time, stats: e0Stats(e0?.[key]),
    };
  });

  const outPl = [];
  for (const el of live.elements) {
    const p = pById[el.id];
    if (!p) continue;
    const st = el.stats || {};
    if (!(st.minutes > 0) && !(st.total_points !== 0)) continue;
    const myFx = gwFx.filter(f => f.team_h === p.team || f.team_a === p.team);
    for (const f of (myFx.length ? myFx : [null])) {
      const home = f ? f.team_h === p.team : null;
      const oppId = f ? (home ? f.team_a : f.team_h) : null;
      outPl.push(normPlayerRow({
        id: p.id, name: p.web_name, pos: POS_FROM_TYPE[p.element_type],
        team: tById[p.team]?.short, opp: oppId ? tById[oppId]?.short : null,
        home, fixture: f?.id ?? null, value: p.now_cost, src: st,
        // tvofold umferd: FPL gefur samtolur, ekki per leik — deilum EKKI,
        // heldur merkjum rodina svo framendinn tvitelji ekki.
        multi: myFx.length > 1,
      }));
    }
  }

  const label = await seasonLabelFromEvents();
  await writeJSON("last_gw.json", {
    updated: status.updated, season: label, gw, archive: false,
    source: "fpl-live", note: "From FPL event/{gw}/live/ via the pipeline. Club figures (shots, shots on target) from football-data.co.uk E0.",
    missing: MISSING_NOTE, fixtures: outFx, players: outPl,
  });
  return { season: label, players: outPl };
}

/* ---- (b) FYRIR TIMABIL: sidasta lokna umferd fyrra timabils ur speglun ---- */
async function buildArchiveGwReport() {
  const seasonLabel = ARCHIVE_SEASON.replace("-", "/20");   // "2025-26" -> "2025/2026"
  const nice = `${ARCHIVE_SEASON.slice(0,4)}/${ARCHIVE_SEASON.slice(5)}`; // "2025/26"

  const { text: tTeams } = await getText(`${MIRROR}/${ARCHIVE_SEASON}/teams.csv`);
  const teamRows = parseCSV(tTeams).rows;
  const shortById = {}, shortByName = {};
  for (const t of teamRows) { shortById[t.id] = t.short_name; shortByName[t.name] = t.short_name; }

  // finna HAESTU umferd sem er til i speglun (skrarnar heita gw1..gw38)
  let gw = null, rows = null;
  for (let g = 38; g >= 1; g--) {
    try {
      const { text } = await getText(`${MIRROR}/${ARCHIVE_SEASON}/gws/gw${g}.csv`);
      /* `parseCSVQuoted`, EKKI `parseCSV` (lagad 11.8.2026): thetta er SAMA
         vaastav-skra sem `deriveImminent` les med quote-aware parsernum.
         Naivi parserinn klippir a hverju kommu, svo nafn med kommu innan
         gaesalappa ("Sanchez, Robert") hlidrar OLLUM dalkum theirrar radar
         — thogult, og ADEINS i thessari skyrslu. Tveir parserar a somu skra
         er hvorttveggja: rong tala og tala sem stangast a vid sjalfa sig. */
      /* `.rows` VAR HER OG DRAP SKYRSLUNA I ThRJA DAGA (lagad 14.8.2026).
         `parseCSV` skilar `{header, rows}` en `parseCSVQuoted` skilar FYLKINU
         sjalfu. Skiptin yfir i quote-aware parserinn (11.8) toku ekki `.rows`
         med ser, svo `.rows` var `undefined`, `.filter` kastadi, `catch`
         gleypti — og lykkjan gekk g=38..1 til einskis, 38 kollum a hverri
         dagskeyrslu, og endadi a "no gameweek file in the mirror".
         MAELT UR SOGUNNI: status.json bar last_gw ok:true 11.8 (GW38, 312
         radir, E0 10/10) og ok:false 12.8-14.8. data/last_gw.json fraus a
         11.8 og GwReport-flipinn hefur birt thann fasta snapshot sidan.
         Vordurinn er `tests/archive-gw-report.mjs`.                        */
      const parsed = parseCSVQuoted(text).filter(r => r.element);
      if (parsed.length) { gw = g; rows = parsed; break; }
    } catch { /* naesta nidur */ }
  }
  if (!gw) { record("last_gw", false, 0, `no gameweek file in the mirror for ${ARCHIVE_SEASON}`); return; }

  let e0 = null;
  const e0File = `fdcouk/E0-${ARCHIVE_SEASON.slice(2,4)}${ARCHIVE_SEASON.slice(5)}.json`; // E0-2526.json
  try { e0 = e0Index(JSON.parse(await readFile(`${DATA}/${e0File}`, "utf8")).rows); } catch {}

  // leikir endurbyggdir ur leikmanna-rodunum sjalfum (was_home + skor)
  const fxMap = {};
  for (const r of rows) {
    const f = fxMap[r.fixture] || (fxMap[r.fixture] = { id: +r.fixture, h:null, a:null,
      h_score:null, a_score:null, kickoff:r.kickoff_time, stats:null });
    const s = shortByName[r.team] || r.team;
    if (String(r.was_home) === "True") { f.h = s; f.h_score = +r.team_h_score; f.a_score = +r.team_a_score; }
    else f.a = s;
    if (r.kickoff_time) f.kickoff = r.kickoff_time;
  }
  let matched = 0;
  const outFx = Object.values(fxMap).sort((x,y) => String(x.kickoff).localeCompare(String(y.kickoff)));
  for (const f of outFx) {
    const key = `${String(f.kickoff).slice(0,10)}|${NAMES[f.h]?.fdcouk}|${NAMES[f.a]?.fdcouk}`;
    f.stats = e0Stats(e0?.[key]);
    if (f.stats) matched++;
  }

  /* ============================================================
     NOFNIN VERDA AD VERA WEB_NAME — LIFANDI OG ARCHIVE MA EKKI ThYDA
     SITTHVAD (lagad 20.8.2026).

     Lifandi leidin (`deriveLastGwReport`) skrifar `name: p.web_name`.
     Archive-leidin skrifadi `name: r.name` UR SPEGLINUM, sem er fullt
     lagalegt nafn. MAELT a data/last_gw.json (GW38 2025/26, 312 radir):
     lengsta nafnid er **55 stafir** — "Joao Maria Lobo Alves Palhares
     Costa Palhinha Goncalves" — og fjogur onnur eru yfir 32. Thau eru
     birt i `XiCard` i "Team of the week", sem er spjaldarod med fastri
     breidd, svo thau KLIPPAST ("Joao Maria Lobo Alv…") medan allt annad
     i appinu ber web_name. Sama svid, tvaer merkingar, eftir thvi hvort
     timabilid er byrjad — thad er verra en badar utgafur, thvi vidmotid
     breytist undir manni 21. agust.

     ThETTA ER UPPFLETTING, EKKI STYTTINGARREGLA, OG ThAD ER NAUDSYNLEGT:
     augljosa heuristikin (sidasta ordid) gefur "Goncalves" fyrir mann sem
     FPL kallar "Palhinha" — RETT stytting a rongu nafni. `players_raw.csv`
     sama timabils ber BADA dalka (`id` = `element` i gw-skranni, og
     `web_name`), svo vorpunin er nakvaem og engin nafna-skorun kemur nalaegt
     henni. Sama vél og element->code-lausnin i `deriveImminent` (kafli 3 i
     CLAUDE.md), af somu astaedu.

     MISTAKIST SOKNIN HELST GAMLA NAFNID: langt nafn er laesilegt, tomt
     nafn er ekki. Sama gildir um leikmann sem finnst ekki i players_raw —
     hann heldur nafninu ur speglinum.                            */
  let webByElement = new Map();
  try {
    const { text: raw } = await getText(`${MIRROR}/${ARCHIVE_SEASON}/players_raw.csv`);
    for (const r of parseCSVQuoted(raw)) {
      const w = String(r.web_name || "").trim();
      if (r.id && w) webByElement.set(String(r.id), w);
    }
  } catch (e) {
    console.warn(`  last_gw: players_raw for ${ARCHIVE_SEASON} did not arrive (${e.message})`
      + " - names stay as the mirror wrote them (full legal names)");
  }

  const outPl = rows.map(r => normPlayerRow({
    id: null,                                   // VILJANDI: id fyrra timabils parast EKKI
    name: webByElement.get(String(r.element)) || r.name, pos: r.position,
    team: shortByName[r.team] || r.team,
    opp: shortById[r.opponent_team] || null,
    home: String(r.was_home) === "True",
    fixture: +r.fixture, value: r.value ? +r.value : null, src: r, multi: false,
  })).filter(p => p.minutes > 0 || p.points !== 0);

  await writeJSON("last_gw.json", {
    updated: status.updated, season: nice, gw, archive: true,
    source: "vaastav-mirror",
    note: `The 2026/27 season has not started, so there is no finished gameweek yet. `
        + `This is the LAST FINISHED one, GW${gw} ${nice}, from the FPL data mirror on `
        + `GitHub. Team numbers (shots, shots on target, corners, fouls) come from `
        + `football-data.co.uk E0.`,
    missing: MISSING_NOTE,
    fixtures: outFx, players: outPl,
  });
  record("last_gw", true, outPl.length,
    `ARCHIVE GW${gw} ${nice} · ${outFx.length} matches · E0 matched ${matched}/${outFx.length}`);
}

/* Skilabodin um thad sem VANTAR fylgja SKRANNI, ekki bara kodanum — svo
   framendinn geti birt astaeduna i stad thess ad skilja eftir tomt plass. */
/* ENDURSKRIFAD 8.8.2026 — TEXTINN VAR ORDINN RANGUR.
   Hann sagdi ad skot-hnit, treverk og big chances vaeru oendurheimtanleg.
   Vidmotid MOTMAELTI honum a sama skja: Umferdar-flipinn teiknar skotakort
   ur ESPN-hnitum og synir "7 Woodwork" i sama kassa. Stada sem er skrifud
   EINU SINNI og aldrei endurmetin verdur ad ósannindum um leid og ny
   heimild kemur — hér BSD (kafli 6). Thess vegna ber hver faersla nu
   HVADAN talan kemur, ekki bara ad hana vanti.                          */
const MISSING_NOTE = {
  shot_map: "Present. Shot coordinates for this gameweek come from ESPN. They carry no "
          + "expected-goals value; per-shot xG exists only in bsd_shots.json (2025/26).",
  big_chances: "Not counted here. BSD's own per-player field is always null, so big chances "
             + "are DERIVED from shots with xG >= 0.18 in bsd_players.json — a fitted proxy, "
             + "not an Opta count, and only for 2025/26.",
  woodwork: "Present. ESPN reports it as its own shot outcome, and BSD does too.",
  avg_position: "Not available as a heatmap. BSD gives one average point per player per "
              + "match, not a density grid, and no source carries touch-level positions.",
  touches_in_box: "Not available. Needs Opta event data (FBref), which answers 403.",
  measured: "2026-08-08",
};

async function seasonLabelFromEvents() {
  // artalid reiknad ur GW1-fresti eins og framendinn gerir
  try {
    const ev = JSON.parse(await readFile(`${DATA}/events.json`, "utf8")).events || [];
    const y = new Date(ev[0]?.deadline_time).getUTCFullYear();
    return Number.isFinite(y) ? `${y}/${String((y + 1) % 100).padStart(2, "0")}` : "";
  } catch { return ""; }
}

/* Ein rod, sama logun ur badum leidum. `src` er hrátt hlut (live stats eda CSV-rod). */
function normPlayerRow({ id, name, pos, team, opp, home, fixture, value, src, multi }) {
  const n = k => { const v = parseFloat(src[k]); return Number.isFinite(v) ? v : null; };
  const i = k => { const v = parseInt(src[k], 10); return Number.isFinite(v) ? v : 0; };
  return {
    id, name, pos, team, opp, home, fixture, multi: !!multi,
    value: value == null ? null : +value,
    minutes: i("minutes"), points: i("total_points"), starts: i("starts"),
    goals: i("goals_scored"), assists: i("assists"),
    cs: i("clean_sheets"), gc: i("goals_conceded"), og: i("own_goals"),
    saves: i("saves"), pens_saved: i("penalties_saved"), pens_missed: i("penalties_missed"),
    yellow: i("yellow_cards"), red: i("red_cards"),
    bonus: i("bonus"), bps: i("bps"),
    xg: n("expected_goals"), xa: n("expected_assists"),
    xgi: n("expected_goal_involvements"), xgc: n("expected_goals_conceded"),
    dc: n("defensive_contribution"), tackles: n("tackles"),
    recoveries: n("recoveries"), cbi: n("clearances_blocks_interceptions"),
    influence: n("influence"), creativity: n("creativity"),
    threat: n("threat"), ict: n("ict_index"),
    xp: n("xP"),
  };
}

/* ========== 13. SKOT-KORT UR ESPN — data/last_gw_shots.json ==========
   ESPN's ooppinbera site-API gefur thad sem VID leitudum ad annars stadar
   og fannst ekki. MAELT 27.7.2026 a ollum 10 leikjum GW38 2025/26:

     commentary[].play  -> HVERT SKOT med:
       fieldPositionX/Y  hnit (0-1)
       type.text         Goal | Goal - Header | Goal - Volley | Goal - Free-kick
                         | Penalty - Scored | Shot On Target | Shot Off Target
                         | Shot Blocked | SHOT HIT WOODWORK | Own Goal
       participants[0]   SKYTTAN — 109/109 fundust i rosters, svo lids-porun
                         gegnum roster er areidanleg (play.team er ALLTAF tomt)
       text              likamshluti ("left footed"/"right footed"/"header") og
                         SVAEDI ("the centre of the box", "outside the box", ...)
     boxscore.teams[].statistics -> possession, pass-nakvaemni, krossar,
       langar sendingar, blokkud skot, tacklingar, rof, hreinsanir, rangstodur
     rosters[].formation + roster[].formationPlace -> byrjunarlids-uppstilling
     rosters[].roster[].stats -> totalShots og shotsOnTarget PER LEIKMANN

   HNITAKERFID — MAELT, EKKI GISKAD: X er fjarlaegd fra marki sem SOTT er ad,
   ekki absolut stada. Prof: i CRY 1-2 ARS liggja OLL thrju morkin a lagu X
   (0,262 / 0,264 / 0,128) thott sitt hvort lidid skoradi. Absolut kerfi
   hefdi sett thau a gagnstaeda enda. Thess vegna er kortid EINN VALLARHELMINGUR.

   KVORDUN — X ER HLUTFALL AF HALFUM VELLI (52,5 m), EKKI AF 105 m.
   Thetta var MAELT gegn svaedis-textanum ESPN sem er ohað hnitunum:
     close_range  (markteigur, 5,5 m)  x <= 0,110   5,5/52,5  = 0,105  PASSAR
     i teig       (vitateigur, 16,5 m) x <= 0,336  16,5/52,5  = 0,314  PASSAR
     utan teigs                        x >= 0,340
   Med 105 m kvarda hefdi teigmarkid att ad vera 0,157 — thad passar EKKI.
   Y er hlutfall af breidd (68 m); box_left 0,241-0,368 / box_centre
   0,370-0,622 / box_right 0,634-0,766 — ostyttandi og i rettri rod.

   Metrar fra marki = x * 52,5. Fyrsta utgafan margfaldadi med 105 og setti
   thvi HVERT SKOT I TVOFALDA FJARLAEGD — mork lentu vid midjulinu.
   ENGIN hnit eru "otraust": x-svidid er 0,040-0,964 = 2-51 m, allt gilt.

   ENGIN xG HER. ESPN gefur hana ekki, svo "big chances" (xG>0,30 per skot)
   er EKKI reiknad. Umferdarskyrslan birtir xG PER LEIKMANN ur FPL i stadinn
   og kallar hana ekki big chances.

   SofaScore var skodad (per-match shotmap MED xG og post-flaggi) en skilar
   HTTP 403 herna og datacenter-IP i Actions faer verri medferd — onothaeft.  */

const ESPN_SOCCER = "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1";
/* ESPN-stuttkodun -> FPL short. AÐEINS tvaer vikja (maelt a 20 lidum). */
const ESPN_SHORT = { MAN:"MUN", MNC:"MCI" };
const espnShort = ab => ESPN_SHORT[ab] || ab;

const SHOT_TYPE = {
  "Goal":"goal", "Goal - Header":"goal", "Goal - Volley":"goal",
  "Goal - Free-kick":"goal", "Penalty - Scored":"goal",
  "Shot On Target":"on_target", "Shot Off Target":"off_target",
  "Shot Blocked":"blocked", "Shot Hit Woodwork":"woodwork",
};
/* SVAEDA-TAFLAN BYR I `scripts/espn-zones.mjs` OG ER FLUTT INN — hun var
   afrituð ordrett hér OG i `fetch-team-shots.mjs`, og badi afritin
   vantadi markteiginn. Sja hausinn thar fyrir maelinguna (1.166 skot). */
/* ---- UPPLOGN UR ESPN-TEXTA ----
   ESPN skrifar: "Attempt saved. X (Team) right footed shot from the centre of
   the box is saved. Assisted by Y with a cross following a corner."
   Thar med fæst thad sem Fable vildi fa ur FBref (403):
     chances created  = hversu oft leikmadur er nefndur sem UPPLEGGJARI
     crosses          = "with a cross"      (adeins their sem SKOPUDU faeri)
     through balls    = "with a through ball"
     set-piece skopun = "following a corner / set piece / direct free kick"
   MAELT a GW38 2025/26: 219 af 290 skotum (76%) nefna upplegg —
   pass 144 · cross 54 · following a corner 33 · through ball 12 ·
   set piece 10 · headed pass 9 · fast break 8 · direct free kick 3.
   ATH: thetta eru krossar sem SKOPUDU SKOT, ekki hrar krossatolur. Fable
   vildi vega hra krossa LAEGRA thvi their "geta verid lelegir" — hér er
   sian innbyggd: krossinn tarf ad hafa leitt til skots.                   */
const ASSIST_RE = /Assisted by ([^.,]+?)(?: with an? ([a-z ]+?))?(?: following ([^.]+?))?\./;
function parseAssist(text) {
  const m = ASSIST_RE.exec(text || "");
  if (!m) return null;
  const how = (m[2] || "pass").trim();
  return {
    by: m[1].trim(),
    how: /through ball/.test(how) ? "through_ball"
       : /cross/.test(how)        ? "cross"
       : /headed/.test(how)       ? "headed_pass"
       : "pass",
    context: m[3] ? m[3].trim().replace(/^a /, "") : null,
  };
}

function shotFoot(text) {
  if (/header/i.test(text)) return "head";
  if (/left footed/i.test(text)) return "left";
  if (/right footed/i.test(text)) return "right";
  return null;
}

async function fetchEspnShots() {
  let base;
  try { base = JSON.parse(await readFile(`${DATA}/last_gw.json`, "utf8")); } catch {
    record("espn_shots", false, 0, "last_gw.json missing — run deriveLastGwReport first");
    return;
  }
  const dates = [...new Set((base.fixtures || []).map(f => String(f.kickoff).slice(0,10)).filter(Boolean))];
  if (!dates.length) { record("espn_shots", false, 0, "no dates in last_gw.json"); return; }

  /* 1) finna ESPN-event-id fyrir hvern leik gegnum scoreboard voldu daganna */
  const espnByPair = {};
  for (const d of dates) {
    try {
      const sb = await getJSON(`${ESPN_SOCCER}/scoreboard?dates=${d.replace(/-/g,"")}`);
      for (const ev of sb.events || []) {
        const cs = ev.competitions?.[0]?.competitors || [];
        const h = cs.find(c => c.homeAway === "home"), a = cs.find(c => c.homeAway === "away");
        if (!h || !a) continue;
        espnByPair[`${espnShort(h.team.abbreviation)}|${espnShort(a.team.abbreviation)}`] = ev.id;
      }
    } catch (e) { console.warn(`espn scoreboard ${d}: ${e.message}`); }
    await new Promise(r => setTimeout(r, 300));
  }

  /* 2) sumary per leik -> skot, lida-tolur, uppstilling */
  const shots = [], outFx = [], playerAgg = {};
  let excluded = 0, matchedFx = 0, noZone = 0;
  for (const f of base.fixtures || []) {
    const eid = espnByPair[`${f.h}|${f.a}`];
    if (!eid) { console.warn(`espn: could not find ${f.h} v ${f.a}`); continue; }
    let d;
    try { d = await getJSON(`${ESPN_SOCCER}/summary?event=${eid}`); }
    catch (e) { console.warn(`espn summary ${eid}: ${e.message}`); continue; }
    matchedFx++;

    // nafn -> lid, ur rosters (play.team er alltaf tomt)
    const teamOf = {}, formation = {}, perPlayer = {};
    for (const r of d.rosters || []) {
      const sh = espnShort(r.team?.abbreviation);
      formation[r.homeAway === "home" ? "h" : "a"] = r.formation || null;
      for (const pl of r.roster || []) {
        const nm = pl.athlete?.displayName;
        if (!nm) continue;
        teamOf[nm] = sh;
        const st = {}; (pl.stats || []).forEach(s => st[s.name] = s.displayValue);
        perPlayer[nm] = {
          name: nm, team: sh, pos: pl.position?.abbreviation || null,
          starter: !!pl.starter, formation_place: pl.formationPlace ? +pl.formationPlace : null,
          shots: +st.totalShots || 0, sot: +st.shotsOnTarget || 0,
          fouls: +st.foulsCommitted || 0, fouled: +st.foulsSuffered || 0,
          saves: +st.saves || 0, shots_faced: +st.shotsFaced || 0,
        };
      }
    }

    // lida-tolur
    const tstats = {};
    for (const t of d.boxscore?.teams || []) {
      const o = {}; (t.statistics || []).forEach(s => {
        const v = parseFloat(s.displayValue);
        o[s.name] = Number.isFinite(v) ? v : s.displayValue;
      });
      tstats[espnShort(t.team?.abbreviation) === f.h ? "h" : "a"] = o;
    }

    // SKOT ur commentary — dedup a play-id (commentary tvitekur radir)
    const seen = new Set();
    for (const c of d.commentary || []) {
      const p = c.play;
      if (!p) continue;
      const label = p.type?.text || "";
      const kind = SHOT_TYPE[label];
      const own  = label === "Own Goal";
      if (!kind && !own) continue;
      const pid = p.id ?? `${label}|${c.sequence}`;
      if (seen.has(pid)) continue;
      seen.add(pid);

      const text = String(c.text || p.text || "");
      const shooter = p.participants?.[0]?.athlete?.displayName || null;
      const x = typeof p.fieldPositionX === "number" ? p.fieldPositionX : null;
      const y = typeof p.fieldPositionY === "number" ? p.fieldPositionY : null;
      /* (0,0) er "ekki skrad", ekki hornid — thad er EINA astaedan til ad
         sleppa skoti. Adur var hér lika `x <= 0.5` af thvi ad vid hofdum
         KVARDANN RANGAN (sja KVORDUN i hausnum): vid toldum x vera hlutfall
         af 105 m, svo 19 skot med x>0,5 virtust vera 53-100 m fra marki og
         voru "otraust". Med rettum kvarda (52,5 m) eru thau 27-51 m — allt
         venjuleg langskot, og OLL merkt "outside the box" af ESPN sjalfu.
         Their voru aldrei rusl; kvardinn okkar var rangur.                 */
      const usable = x != null && y != null && !(x === 0 && y === 0);
      if (!usable) excluded++;
      const zone = shotZone(text);
      /* SKOT AN SVAEDIS ER TALID OG BIRT. `a.in_box` telur adeins thegar
         `zone` er thekkt, svo ohreyft svaedi les eins og „ekki i teig" i
         summunni — nakvaemlega villan sem markteigurinn olli. Talan hér
         gerir stærd theirrar thagnar SYNILEGA i skranni sjalfri.        */
      if (!zone && !own) noZone++;

      const asst = parseAssist(text);
      shots.push({
        fixture: f.id, espn_event: eid,
        team: own ? null : (shooter ? teamOf[shooter] || null : null),
        player: shooter, kind: own ? "own_goal" : kind,
        minute: p.clock?.displayValue || null, period: p.period?.number ?? null,
        x, y, usable, zone, in_box: zone ? IN_BOX.has(zone) : null,
        foot: shotFoot(text), text: text || null,
        assist_by: asst?.by ?? null, assist_type: asst?.how ?? null,
        assist_context: asst?.context ?? null,
      });

      /* UPPLEGGJARINN faer skopunar-tolur. Hann er annar leikmadur en
         skyttan, svo hann fer i sama playerAgg gegnum eigid nafn.        */
      if (asst?.by) {
        const c = playerAgg[asst.by] || (playerAgg[asst.by] = {
          name: asst.by, team: teamOf[asst.by] || null,
          shots:0, on_target:0, off_target:0, blocked:0, woodwork:0, goals:0, in_box:0,
          chances_created:0, cross_created:0, through_balls:0, setpiece_created:0 });
        c.chances_created = (c.chances_created || 0) + 1;
        if (asst.how === "cross")        c.cross_created  = (c.cross_created || 0) + 1;
        if (asst.how === "through_ball") c.through_balls  = (c.through_balls || 0) + 1;
        if (asst.context && /corner|set piece|free kick/.test(asst.context))
          c.setpiece_created = (c.setpiece_created || 0) + 1;
      }

      if (shooter && !own) {
        const a = playerAgg[shooter] || (playerAgg[shooter] = {
          name: shooter, team: teamOf[shooter] || null,
          shots:0, on_target:0, off_target:0, blocked:0, woodwork:0, goals:0, in_box:0,
          chances_created:0, cross_created:0, through_balls:0, setpiece_created:0 });
        a.shots++;
        if (kind === "goal") { a.goals++; a.on_target++; }
        else if (kind === "on_target") a.on_target++;
        else if (kind === "off_target") a.off_target++;
        else if (kind === "blocked") a.blocked++;
        else if (kind === "woodwork") a.woodwork++;
        if (zone && IN_BOX.has(zone)) a.in_box++;
      }
    }

    outFx.push({
      fixture: f.id, espn_event: eid, h: f.h, a: f.a,
      h_score: f.h_score, a_score: f.a_score,
      formation_h: formation.h || null, formation_a: formation.a || null,
      team_stats: tstats,
      lineup: Object.values(perPlayer).filter(p => p.starter || p.shots || p.saves),
    });
    await new Promise(r => setTimeout(r, 350));
  }

  await writeJSON("last_gw_shots.json", {
    updated: status.updated, season: base.season, gw: base.gw, archive: !!base.archive,
    source: "espn-site-api",
    note: "Shots with coordinates from ESPN commentary. X is the DISTANCE FROM THE GOAL BEING ATTACKED "
        + "(measured: every goal in CRY-ARS sits at a low X even though both sides scored) — the map is ONE half of the pitch. "
        + "Woodwork is its own shot type at ESPN ('Shot Hit Woodwork'). Zone and body part "
        + "are read from the ESPN text, not guessed.",
    caveats: {
      no_xg: "ESPN gives no per-shot xG, so BIG CHANCES are not computed. The gameweek report shows per-player xG from FPL instead.",
      excluded: `${excluded} shots had no coordinates (0,0 = not recorded by ESPN) and are marked usable:false.`,
      no_zone: `${noZone} shots carry no zone: ESPN's text did not place them ("from a free kick", or no "from" clause at all). `
             + `zone:null means THE SOURCE DID NOT SAY, never "outside the box" — but the per-player in_box total can only `
             + `count what it knows, so an unplaced shot is absent from it. The zone vocabulary was measured over 1,166 `
             + `shots (50 matches) and every phrase ESPN uses is matched; see scripts/espn-zones.mjs.`,
      scale: "x is a share of HALF the pitch: metres from goal = x * 52.5. Calibrated against the ESPN zone text (six-yard box 0.105 / penalty area 0.314).",
      no_touches: "Touches in the box and average position are not in the ESPN feed.",
      created: "chances_created / cross_created / through_balls / setpiece_created are READ FROM THE ESPN TEXT "
             + "('Assisted by X with a cross following a corner') — 219 of 290 shots (76%) mention an assist in GW38. "
             + "These are crosses/through balls that CREATED A SHOT, not raw counts.",
    },
    fixtures: outFx, shots, players: Object.values(playerAgg),
  });
  record("espn_shots", true, shots.length,
    `${matchedFx}/${(base.fixtures||[]).length} matches · ${shots.length} shots · ${excluded} without coordinates`);
}

/* ========== 14. FYRRI TIMABIL PER LEIKMANN — data/player_seasons.json ==========
   Spjold leikmanna syna "i ar vs i fyrra vs hitteðfyrra". Til thess tharf
   LOKATOLUR fyrri timabila per leikmann — sem FPL-API-ið birtir EKKI
   (thad man adeins yfirstandandi timabil).

   PORUNARLYKILLINN ER `code`, EKKI `id`. FPL endurnytir element-id milli
   timabila en `code` er fast a leikmanni aevilangt. Maelt 28.7.2026:
   af 563 nuverandi leikmonnum eiga 456 gogn i 2025-26, 348 i 2024-25 og
   277 i 2023-24 (hinir voru ekki i deildinni).

   SAETI ERU REIKNUD HER, ekki i framendanum: 563 leikmenn x ~16 tolur x
   3 timabil er ekki vinna sem a ad gerast i React vid hverja opnun.
   Sætin eru innan TIMABILSINS og adeins medal theirra sem SPILUDU
   (minutur > 0) — annars vaeri "1 af 800" thar sem 300 spiludu aldrei.

   defensive_contribution kom FYRST 2025/26. Fyrir eldri timabil er hun
   EKKI 0 heldur VANTAR — sja field_availability. Framendinn a ad birta
   strik, ekki null-i breytt i nullu.                                     */

/* FIMM TIMABIL, EKKI ThRJU (beidni notanda 7.8.2026: "eg vill geta skodad
   fyrri timabil"). Speglunin BER thau — maelt: 2019-20 til 2025-26 skila
   oll HTTP 200 (174-380 KB). Vid tokum fimm svo listinn passi vid
   player_gw_*.json (2122-2526) sem umferdar-bilid les — annars gaeti
   notandinn valid timabil i fellilistanum sem umferdar-bilid a ekki.
   KOSTNADUR: player_seasons.json staekkar (~1,9 MB -> ~3 MB); hun er
   letihladin i listanum svo thad snertir ekki fyrstu hledslu appsins.  */
const SEASON_DIRS = ["2025-26", "2024-25", "2023-24", "2022-23", "2021-22"];
const seasonLabel = d => `${d.slice(0, 4)}/${d.slice(5)}`;

/* CSV med gaesalappa-studningi. parseCSV (naiv) dugar fyrir E0 en players_raw
   hefur `news` sem inniheldur kommur inni i gaesalöppum. */
function parseCSVQuoted(text) {
  const rows = [];
  let row = [], cell = "", inQ = false;
  const t = text.replace(/\r\n/g, "\n");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQ) {
      if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else inQ = false; }
      else cell += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  const header = rows.shift() || [];
  return rows.filter(r => r.length > 1)
    .map(r => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

/* Tolur sem fa SAETI. `rev:true` = LAEGRA er betra (xGC). */
const SEASON_STATS = [
  { k: "total_points" }, { k: "minutes" }, { k: "starts" },
  { k: "goals_scored" }, { k: "assists" },
  { k: "expected_goals" }, { k: "expected_goals_per_90" },
  { k: "expected_assists" }, { k: "expected_assists_per_90" },
  { k: "expected_goal_involvements" }, { k: "expected_goal_involvements_per_90" },
  { k: "expected_goals_conceded", rev: true },
  { k: "clean_sheets" }, { k: "goals_conceded", rev: true },
  { k: "saves" }, { k: "bonus" }, { k: "bps" },
  { k: "defensive_contribution" },
  { k: "points_per_90", derived: true }, { k: "dc_per_start", derived: true },
];

/* SVID SEM ERU BARA BORIN AFRAM (engin saeti) — svo SOMU dalkarnir virki i
   leikmannalistanum yfir OLL timabil. Adur virkudu adeins 31 af 65 STAT_DEFS
   a sogulegri rod. Svid sem vantar i eldra timabili verda null (VANTAR),
   EKKI 0 — sja field_availability i skranni.                              */
const SEASON_CARRY = [
  "points_per_game", "form", "ict_index", "influence", "creativity", "threat",
  "selected_by_percent", "yellow_cards", "red_cards", "own_goals",
  "penalties_missed", "penalties_saved", "dreamteam_count",
  "clearances_blocks_interceptions", "tackles", "recoveries",
  "starts_per_90", "saves_per_90", "clean_sheets_per_90",
  "goals_conceded_per_90", "expected_goals_conceded_per_90",
  "defensive_contribution_per_90", "value_season", "value_form",
  "cost_change_start",
];

async function fetchPlayerSeasons() {
  const out = {};                       // code -> { "2025/26": {...} }
  const availability = {};              // svid -> [timabil sem hafa thad]
  const counts = {};
  for (const dir of SEASON_DIRS) {
    const label = seasonLabel(dir);
    let rows;
    try {
      const { text } = await getText(`${MIRROR}/${dir}/players_raw.csv`);
      rows = parseCSVQuoted(text);
    } catch (e) { console.warn(`player_seasons ${dir}: ${e.message}`); continue; }
    if (!rows.length) continue;

    const has = new Set(Object.keys(rows[0]));
    for (const s of SEASON_STATS) {
      if (s.derived || has.has(s.k)) (availability[s.k] ||= []).push(label);
    }
    for (const k of SEASON_CARRY) if (has.has(k)) (availability[k] ||= []).push(label);

    // 1) grunn-rod per leikmann
    const recs = rows.map(r => {
      const n = k => { const v = parseFloat(r[k]); return Number.isFinite(v) ? v : null; };
      const mins = n("minutes") ?? 0, starts = n("starts") ?? 0;
      const rec = {
        code: r.code, id: n("id"), element_type: n("element_type"),
        web_name: r.web_name || `${r.first_name || ""} ${r.second_name || ""}`.trim(),
        now_cost: n("now_cost"),
      };
      for (const s of SEASON_STATS) {
        if (s.derived) continue;
        rec[s.k] = has.has(s.k) ? n(s.k) : null;       // VANTAR != 0
      }
      for (const k of SEASON_CARRY) {
        if (!has.has(k)) { rec[k] = null; continue; }  // VANTAR != 0
        const v = parseFloat(r[k]);
        rec[k] = Number.isFinite(v) ? v : (r[k] === "" || r[k] == null ? null : r[k]);
      }
      rec.points_per_90 = mins > 0 ? +(((n("total_points") ?? 0) / mins) * 90).toFixed(2) : null;
      rec.dc_per_start  = (rec.defensive_contribution != null && starts > 0)
        ? +(rec.defensive_contribution / starts).toFixed(2) : null;
      rec.played = mins > 0;
      return rec;
    });

    // 2) SAETI innan timabilsins, adeins medal theirra sem spiludu
    const pool = recs.filter(r => r.played);
    counts[label] = pool.length;
    for (const s of SEASON_STATS) {
      const vals = pool.filter(r => r[s.k] != null)
        .sort((a, b) => s.rev ? a[s.k] - b[s.k] : b[s.k] - a[s.k]);
      let rank = 0, prev = null;
      vals.forEach((r, i) => {
        if (prev === null || r[s.k] !== prev) rank = i + 1;
        prev = r[s.k];
        (r.rank ||= {})[s.k] = rank;
      });
      // hversu margir eiga tolu i thessari staerd (nefnarinn i "3 af 412")
      const n = vals.length;
      vals.forEach(r => { (r.rank_of ||= {})[s.k] = n; });
    }

    for (const r of recs) {
      if (!r.code) continue;
      (out[r.code] ||= {})[label] = r;
    }
  }

  /* SIA A LEIKMENN SEM ERU I DEILDINNI NUNA.
     Framendinn flettir ALLTAF upp med `code` ur players.json, svo saga
     leikmanns sem er farinn ur deildinni er ONOTHAEF — hun getur ekki
     birst. Maelt: 935 af 1420 (66%) voru horfnir og bnru 1,22 MB af
     2,52 MB. Skrain er sott UR NETI vid hverja opnun, svo thetta er
     baedi minna repo OG hradari hledsla. Pipeline keyrir daglega, svo ef
     leikmadur kemur til baka birtist saga hans aftur naesta dag.        */
  let kept = out, dropped = 0;
  try {
    const cur = JSON.parse(await readFile(`${DATA}/players.json`, "utf8")).players || [];
    const live = new Set(cur.map(p => String(p.code)));
    if (live.size > 100) {
      kept = {};
      for (const [code, v] of Object.entries(out)) {
        if (live.has(String(code))) kept[code] = v; else dropped++;
      }
    }
  } catch (e) { console.warn(`player_seasons: the filter failed (${e.message}) — writing everything`); }

  const seasons = SEASON_DIRS.map(seasonLabel).filter(l => counts[l]);
  await writeJSON("player_seasons.json", {
    updated: status.updated, seasons, pool_sizes: counts,
    key: "code",
    note: "Final totals for earlier seasons per player from the vaastav mirror of FPL data. "
        + "PAIRED ON `code` (fixed to a player), NOT `id`, which FPL reuses between seasons. "
        + "Ranks are within a season and only among those who played (minutes>0).",
    field_availability: availability,
    missing_note: "defensive_contribution first appeared in 2025/26. For earlier seasons it is null = MISSING, not 0.",
    players: kept,
  });
  record("player_seasons", true, Object.keys(kept).length,
    `${seasons.join(", ")} · ${seasons.map(s => `${s}:${counts[s]}`).join(" ")}`
    + (dropped ? ` · ${dropped} outside the league skipped` : ""));
}

/* ========== 15. MO / AO — data/imminent.json ==========
   "Mark ohjakvaemilegt" og "Assist ohjakvaemilegt": hverjir eru ad byggja
   upp faeri en hafa ekki skorad enn. Formulan og MAELINGIN a bak vid hana
   eru i src/stats.js — her er adeins GLUGGINN reiknadur.

   Gluggi = sidustu 4 LOKNU umferdir. I timabili koma thaer ur
   data/live/gw{n}.json; fyrir timabil (engar loknar) er sami
   safn-hattur og i last_gw: sidustu 4 umferdir fyrra timabils ur
   vaastav-speglun, MERKT archive:true.                                    */

const IMM_WINDOW = 4;      // mo/ao — VALIDERAD vid 4 umferdir
const START_WINDOW = 5;    // byrjunar-likur — VALIDERAD vid 5 umferdir
const FETCH_WINDOW = Math.max(IMM_WINDOW, START_WINDOW);

async function deriveImminent() {
  const jread = async p => JSON.parse(await readFile(`${DATA}/${p}`, "utf8"));
  let events = [];
  try { events = (await jread("events.json")).events || []; } catch {}
  const finished = events.filter(e => e.finished).map(e => e.id).sort((a, b) => a - b);

  let rows = [], season, gws, archive;
  /* ============================================================
     GLUGGINN SKIPTIR UM HEIMILD VID `FETCH_WINDOW`, EKKI VID 1 (20.8.2026)

     VILLAN: `finished.length >= 1` skipti yfir a lifandi live-skrar um
     leid og FYRSTA umferdin var lokin, og tha var glugginn EIN umferd.
     Bædi likönin sem lesa hann eru VALIDERUD vid 4-5 umferdir, og hvorugt
     getur svarad ur einni:
       · `startFeatures` (src/stats.js) skilar null vid faerri en 2 gildi
       · `inImminentPool` krefst 180 minutna, en ein umferd nær 90 i mesta

     MAELT a `data/imminent.json` (endurreiknad per gluggastaerd):
       gluggi 1  ->  0 af 841 radum med `start_feats`,  0 yfir 0,75,  mo/ao-laug 0
       gluggi 2  ->  840,  170,  72
       gluggi 5  ->  840,  127,  184
     Med einni umferd er `start_prob` thvi null hja OLLUM 595 leikmonnum,
     "Chance of 60+ minutes" tæmist, Imminent-sýnin verdur tóm og les eins
     og "enginn er a leidinni", og GW2-bokhaldid skrair NULL thekju.

     OG ThAD SLEKKUR MAELDU GOLFI ThEGJANDI — ThAD ER VERRI HELMINGURINN.
     `rotation.js:159` er `if (cP != null && cP < MIN_START_PROB) continue`
     og `:165` margfaldar med `(cP ?? 1)`. Med P null hja ollum er golfid
     ovirkt OG kandidatar hætta ad vera afslattadir. 472 af 840 rodum eru
     undir 0,15 i dag, 69 theirra markmenn — nakvaemlega hopurinn sem
     `MIN_START_PROB` var settur inn fyrir 4.8.2026 eftir ad notandanum var
     bodinn Meslier, varamarkmadur, sem roterings-par. CLAUDE.md kafli 3:
     golfid "virtist virka; thad var bara aldrei spurt". Sami visir aftur.

     LAUSNIN ER SU VARFAERNA: safnid stendur ThANGAD TIL lifandi glugginn
     er ORDINN eins langur og sa sem var validerud (`FETCH_WINDOW` = 5).
     Safns-glugginn er sjalfur MAELDUR gluggi (5 sidustu umferdir fyrra
     timabils) og endurkvordunin i `PRESEASON_CAL` er maeld a NAKVAEMLEGA
     theim — `archive: true` helst thvi satt og kvordunin virk allan
     timann sem hun a ad vera.
     BLENDINGUR (lifandi umferdir framan a safns-tagl) VAR EKKI BYGGDUR:
     thad er NY MAELING, ekki lagfaering — enginn hefur maelt likan a
     glugga sem spannar timabils-skiptin. Kafli 3: maela fyrst.
     ============================================================ */
  if (finished.length >= FETCH_WINDOW) {
    // ---- i timabili: ur okkar eigin live-skram ----
    gws = finished.slice(-FETCH_WINDOW);
    season = await seasonLabelFromEvents();
    archive = false;
    let players = [];
    try { players = (await jread("players.json")).players; } catch {}
    const pById = {}; players.forEach(p => pById[p.id] = p);
    const acc = {};
    for (const gw of gws) {
      let live;
      try { live = await jread(`live/gw${gw}.json`); } catch { continue; }
      for (const el of live.elements || []) {
        const st = el.stats || {}, p = pById[el.id];
        if (!p) continue;
        const a = acc[el.id] || (acc[el.id] = {
          code: p.code, name: p.web_name, team: p.team, pos: POS_FROM_TYPE[p.element_type],
          now_cost: p.now_cost, window: blankWindow(), series: [] });
        addWindow(a.window, st);
        a.series.push(gwPoint(gw, st));
      }
    }
    rows = Object.values(acc);
  } else {
    // ---- fyrir timabil: safn ur speglun ----
    archive = true;
    const nice = `${ARCHIVE_SEASON.slice(0,4)}/${ARCHIVE_SEASON.slice(5)}`;
    season = nice;
    const { text: tTeams } = await getText(`${MIRROR}/${ARCHIVE_SEASON}/teams.csv`);
    const shortByName = {};
    for (const t of parseCSV(tTeams).rows) shortByName[t.name] = t.short_name;

    // finna haestu tiltaeku umferdina og taka 4 aftur fra henni
    let top = 0;
    for (let g = 38; g >= 1; g--) {
      try { await getText(`${MIRROR}/${ARCHIVE_SEASON}/gws/gw${g}.csv`); top = g; break; } catch {}
    }
    if (!top) { record("imminent", false, 0, "no gameweek file in the mirror"); return; }
    gws = [];
    for (let g = Math.max(1, top - FETCH_WINDOW + 1); g <= top; g++) gws.push(g);

    const acc = {};
    for (const g of gws) {
      let csv;
      try { ({ text: csv } = await getText(`${MIRROR}/${ARCHIVE_SEASON}/gws/gw${g}.csv`)); }
      catch { continue; }
      for (const r of parseCSVQuoted(csv)) {
        if (!r.element) continue;
        const key = r.element;
        const a = acc[key] || (acc[key] = {
          code: null, name: r.name, team: shortByName[r.team] || r.team,
          pos: r.position, now_cost: r.value ? +r.value : null, window: blankWindow(), series: [] });
        addWindow(a.window, r);
        a.series.push(gwPoint(g, r));
      }
    }
    rows = Object.values(acc);

    /* ---- SUMARGLUGGINN: SKJALASAFNID BER LID SIDASTA TIMABILS ----
       Radirnar hér koma ur gw-skram fyrra timabils og bera thvi lidid sem
       leikmadurinn spiladi med ThA. Appid flettir theim hins vegar upp
       eftir lidi hans I DAG (`matchImminent`, skordad vid lid). Fyrir HVERN
       sumarkaupa-leikmann misheppnast su uppfletting, `P` verdur null — og
       null-reglan i rotation.js (`P=null utilokar ALDREI`) hleypir honum tha
       gegnum byrjunar-golfid.

       MAELT 8.8.2026: **103 af 572** finnast undir ODRU lidi en sinu eigin.
       Notandinn sa thetta a Meslier: skradur undir LEE, spilar med ARS, og
       bakvordur med `starts5: 0, mins5: 0` — sem golfid AETTI ad sia burt —
       var bodinn sem roterings-par. Golfid VIRTIST virka; thad var bara
       aldrei spurt.

       LEYST NAKVAEMLEGA, EKKI MED NAFNA-PORUN: gw-skrain ber `element`
       (timabils-bundid id) og `players_raw.csv` sama timabils parar thad
       vid `code`, sem er FAST yfir timabil. Kodinn flettir svo beint upp i
       leikmonnum dagsins. Engin nafna-skorun, engin arekstrahaetta.
       Leikmadur sem er EKKI i deildinni i dag helst oleystur med
       `code: null` og gamla lidinu — thad er rett, hann a engan i dag.    */
    try {
      const { text: raw } = await getText(`${MIRROR}/${ARCHIVE_SEASON}/players_raw.csv`);
      const codeByElement = new Map();
      for (const r of parseCSVQuoted(raw))
        if (r.id && r.code) codeByElement.set(String(r.id), +r.code);

      let cur = [], curTeams = [];
      try { cur = (await jread("players.json")).players || []; } catch {}
      try { curTeams = (await jread("teams.json")).teams || []; } catch {}
      const byCode = new Map(cur.map(p => [p.code, p]));
      const shortById = Object.fromEntries(curTeams.map(t => [t.id, t.short]));

      let moved = 0, resolved = 0;
      for (const [element, r] of Object.entries(acc)) {
        const code = codeByElement.get(String(element));
        if (code == null) continue;
        r.code = code;
        const p = byCode.get(code);
        if (!p) continue;                       // farinn ur deildinni — rett ad sleppa
        resolved++;
        const short = shortById[p.team];
        if (short && short !== r.team) { r.team = short; moved++; }
      }
      console.log(`  imminent: ${resolved} rows resolved on code, ${moved} moved to today's club`);
    } catch (e) {
      /* Mistakist thetta er skrain EINS OG ADUR — verri, en ekki brotin. */
      console.warn(`  imminent: could not resolve code/club (${e.message}) — rows carry last season's club`);
    }
  }

  const num_ = v => { const x = parseFloat(v); return Number.isFinite(x) ? x : 0; };
  /* TVEIR GLUGGAR UR EINNI SOKN.
     mo/ao voru validerud vid 4 umferdir og byrjunar-likur vid 5, svo vid
     saekjum 5 og LEIDUM mo-gluggann ut ur seriunni (sidustu 4 umferdir).
     Ad breyta mo i 5 vaeri ad kasta valideringunni.                       */
  rows.forEach(r => {
    (r.series || []).sort((a, b) => a.gw - b.gw);
    const uniqGws = [...new Set((r.series || []).map(x => x.gw))].sort((a, b) => a - b);
    const moGws = new Set(uniqGws.slice(-IMM_WINDOW));
    const w = blankWindow();
    for (const x of (r.series || [])) {
      if (!moGws.has(x.gw)) continue;
      w.minutes += x.min; w.goals += x.g; w.assists += x.a;
      w.xg += x.xg; w.xa += x.xa;
      w.threat += x.thr; w.creativity += x.cre;
    }
    ["xg","xa","threat","creativity"].forEach(k => { w[k] = +w[k].toFixed(3); });
    w.xgi = r.window.xgi; w.bps = r.window.bps; w.starts = r.window.starts;
    w.gi = w.goals + w.assists;
    r.window = w;
    r.mo_gws = [...moGws].sort((a, b) => a - b);

    /* BYRJUNAR-LIKUR: minutur per umferd yfir ALLAR 5. Tvofold umferd er
       LOGD SAMAN i eina umferd — spurningin er "spilar hann 60+ i naestu
       UMFERD", ekki i naesta leik.                                        */
    const byGw = new Map();
    for (const x of (r.series || [])) byGw.set(x.gw, (byGw.get(x.gw) ?? 0) + x.min);
    const mins = uniqGws.map(g => byGw.get(g) ?? 0);
    r.start_minutes = mins;
    if (mins.length >= 2) {
      const half = Math.max(1, Math.floor(mins.length / 2));
      const late = mins.slice(-half).reduce((a, b) => a + b, 0) / half;
      const early = mins.slice(0, half).reduce((a, b) => a + b, 0) / half;
      /* NAMUNDUNIN HELST OBREYTT svo skrain se stafrett eins og adur;
         thad sem breytist er UPPSPRETTAN (ein utfaersla) og `value`-
         varaleidin.                                                     */
      const f = startFeatures(mins, r.now_cost);
      if (f) r.start_feats = {
        starts5: +f.starts5.toFixed(3),
        mins5: +f.mins5.toFixed(1),
        trend: +f.trend.toFixed(1),
        started_last: f.started_last,
        value: f.value,
      };
    }
  });

  await writeJSON("imminent.json", {
    updated: status.updated, season, archive, gws,
    window: IMM_WINDOW, start_window: START_WINDOW, fetched_gws: gws,
    note: "Window = the last " + IMM_WINDOW + " finished gameweeks. The coefficients themselves live in "
        + "src/stats.js (moScore/aoScore) so the tests run the same code as the app.",
    measured: {
      samples: 13273, seasons: 3, gameweeks: 114,
      mo: "A composite index (xGI 0.8 + threat/25 0.3 + bad luck 0.2). The volume term "
        + "was xG alone until 29.7.2026; xGI measured better over 4 seasons "
        + "(lift 2.498 against 2.379 for goals+assists, 3/4 seasons, no new "
        + "parameters). Out of sample 2.888 "
        + "against 2.696 (xG alone) and 2.779 (threat alone) — wins in 2/3 seasons, ties in the third.",
      ao: "BARE creativity/90. A composite AO index WAS tested and FAILED: 2.179 against 2.206 "
        + "for bare creativity, losing in 0/3 seasons. The xA weight was always chosen as 0.",
      pool: "Only players with 0-1 goals+assists in the window and 180+ minutes.",
      start_prob: "start_feats/start_minutes feed the START PROBABILITY (5 gameweeks). "
        + "MEASURED on 65,557 samples: accuracy 88.0% against 88.2% for 'started last time' (LEVEL), "
        + "but Brier 0.0888 against 0.1176 (-24%) and the BENCH TRAP: the lowest decile "
        + "catches 42-49% of those who drop to the bench despite having started (lift 2.09x). "
        + "Rest (<4 days) had NO effect and is therefore NOT in the model.",
    },
    players: rows,
  });
  /* HVERS VEGNA GLUGGINN ER ThESSI — SYNILEGT I `status.json`. Ad segja
     adeins "ARCHIVE" svarar ekki hvort thad se vegna forleiks eda vegna
     thess ad lifandi glugginn se enn of stuttur, og thad tvennt lita eins
     ut i vidmotinu medan hitt er timabundid.                            */
  record("imminent", true, rows.length,
    `${archive ? "ARCHIVE " : ""}${season} GW${gws[0]}-${gws[gws.length-1]}`
    + ` (${finished.length} finished round${finished.length === 1 ? "" : "s"} this season; `
    + `the live window takes over at ${FETCH_WINDOW})`);
}

/* Ein umferd i rodinni — nog til ad teikna trend an thess ad blasa upp skrana. */
function gwPoint(gw, r) {
  const f = k => { const v = parseFloat(r[k]); return Number.isFinite(v) ? +v.toFixed(2) : 0; };
  return { gw: +gw, min: f("minutes"), xg: f("expected_goals"), xa: f("expected_assists"),
           thr: f("threat"), cre: f("creativity"),
           g: f("goals_scored"), a: f("assists") };
}
function blankWindow() {
  return { minutes:0, goals:0, assists:0, xg:0, xa:0, xgi:0, threat:0, creativity:0, bps:0, starts:0 };
}
function addWindow(w, r) {
  const f = k => { const v = parseFloat(r[k]); return Number.isFinite(v) ? v : 0; };
  w.minutes   += f("minutes");
  w.goals     += f("goals_scored");
  w.assists   += f("assists");
  w.xg        += f("expected_goals");
  w.xa        += f("expected_assists");
  w.xgi       += f("expected_goal_involvements");
  w.threat    += f("threat");
  w.creativity+= f("creativity");
  w.bps       += f("bps");
  w.starts    += f("starts");
  ["xg","xa","xgi","threat","creativity"].forEach(k => { w[k] = +w[k].toFixed(3); });
}

/* ========== MAIN ========== */
async function main() {
  await mkdir(DATA, { recursive: true });

  // --fast: aðeins fljótandi gögn (meiðsli, verð, fixtures). Keyrt á 30 mín.
  if (process.argv.includes("--fast")) {
    try { await fetchFast(); }
    catch (e) { record("fast_news", false, 0, e.message); await writeJSON("status_fast.json", status); process.exit(1); }
    return;
  }

  let events, els;
  try {
    ({ events, els } = await fetchFPL());
  } catch (e) {
    record("fpl_bootstrap", false, 0, e.message);
    await writeJSON("status.json", status);
    console.error("FPL failed — aborting the run (everything else depends on it).");
    process.exit(1);
  }

  try { await computeDefcon(events, els); } catch (e) { record("defcon", false, 0, e.message); }
  try { await computeDefconHistory(); }        catch (e) { record("defcon_history", false, 0, e.message); }
  try { await computeConsistency(); }          catch (e) { record("consistency", false, 0, e.message); }
  try { await computePlayerForm(events, els); } catch (e) { record("player_form", false, 0, e.message); }
  if (FLAGS.apisports) { try { await fetchLineups(); } catch (e) { record("api_lineups", false, 0, e.message); } }
  /* ============================================================
     ALDUR ELO ER TALINN, EKKI ADEINS SIDASTA UTKOMA (14.8.2026).
     `elo` er inntak i FFDR (`DIFF_W.elo = 0.15` i ollum fjorum stodu-hopum)
     og sokn hennar er TIMANAEM: hun brast 11.8 og 13.8 med timeout, en var
     graen 10., 12. og 14. — ~2 daga af 5. Bilun EYDIR EKKI `elo.json`, svo
     likanid keyrir afram a GOMLUM tolum og ekkert i pipeline sagdi fra thvi:
     ein raud lina hverfur um leid og naesta keyrsla tekst, og STADAN sem
     eftir stendur ("gogn fra i fyrradag, birt sem i dag") var osynileg.
     `eloStale` i model.js varar vid i VIDMOTINU vid 2 og 5 daga — thetta er
     sama spurning, spurd i pipeline, thar sem enginn var ad spyrja.
     ATH: thetta er ekki "tom keyrsla thurrkar ut god gogn" (8e) heldur hitt
     einkennid af sama meidi: GOMUL gogn birt sem NY.                     */
  if (FLAGS.elo)    { try { await fetchElo(); }              catch (e) { record("elo", false, 0, e.message); } }
  /* EIN LEID INN, EIN LEID UT: `eloAgeRow` skilar ALLTAF rod (sja hausinn a
     fallinu). Aður var `record` inni i `if (Number.isFinite(ageH))` an
     `else`, svo onothaeft `updated` let rodina hverfa thegjandi.         */
  try {
    const eloFile = JSON.parse(await readFile(`${DATA}/elo.json`, "utf8"));
    const row = eloAgeRow(eloFile);
    record("elo_age", row.ok, row.count, row.note);
  } catch { record("elo_age", false, 0, "elo.json missing - FFDR has no Elo input at all"); }
  if (FLAGS.fdcouk) { try { await fetchFdcouk(); }           catch (e) { record("fdcouk_e0", false, 0, e.message); }
                      try { await fetchHistoricalE0(); }     catch (e) { record("fdcouk_history", false, 0, e.message); }
                      try { await fetchPromotedBaseline(); } catch (e) { record("promoted_baseline", false, 0, e.message); } }
  if (FLAGS.weather){ try { await fetchWeather(); }          catch (e) { record("weather", false, 0, e.message); } }
  if (FLAGS.euro)   { try { await fetchEuro(); }              catch (e) { record("euro_fixtures", false, 0, e.message); } }
  if (FLAGS.odds_key){ try { await fetchOdds(); }              catch (e) { record("odds", false, 0, e.message); } }
  if (FLAGS.apisports){ try { await fetchInjuries(); }          catch (e) { record("apisports_injuries", false, 0, e.message); } }
  /* DAGLEGA, EKKI --fast: loknir leikir breytast ekki innan dags og
     30-minutna keyrslan a ekki ad bera ~20 koll a viku ad óthorfu.  */
  if (FLAGS.bsd)      { try { await fetchBsdLive(); }            catch (e) { record("bsd_live", false, 0, e.message); } }

  // ---- AFLEIDD LÖG (engin ný köll) — keyrð SÍÐAST því þau lesa skrárnar ofan ----
  if (FLAGS.travel)  { try { await deriveTravel(); }           catch (e) { record("travel", false, 0, e.message); } }
  if (FLAGS.derived) { try { await deriveGameweekShape(); }    catch (e) { record("gameweek_shape", false, 0, e.message); }
                       try { await deriveRotation(); }         catch (e) { record("rotation", false, 0, e.message); }
                       try { await deriveTeamForm(); }          catch (e) { record("team_form", false, 0, e.message); }
                       try { await deriveLuck(); }              catch (e) { record("luck", false, 0, e.message); }
                       try { await deriveFormFeatures(); }      catch (e) { record("form_features", false, 0, e.message); }
                       try { await deriveLastGwReport(); }      catch (e) { record("last_gw", false, 0, e.message); }
                       try { await fetchEspnShots(); }          catch (e) { record("espn_shots", false, 0, e.message); }
                       try { await fetchPlayerSeasons(); }      catch (e) { record("player_seasons", false, 0, e.message); }
                       try { await deriveImminent(); }          catch (e) { record("imminent", false, 0, e.message); } }

  await writeJSON("status.json", status);
  console.log("\n=== status.json ===");
  console.log(JSON.stringify(status, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
