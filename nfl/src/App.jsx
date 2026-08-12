/* ============================================================
   App.jsx — skelin. Flipar, deildarstillingar, gagnahledsla.
   ALLT reikni-vit er i `model.js` / `build.js` / `accuracy.js`.
   Thessi skra a ad vera BIRTING og ekkert annad.
   ============================================================ */

import React, { useEffect, useMemo, useState, useCallback } from "react";
import * as D from "./data.js";
import { buildRows, normalizeLeague } from "./build.js";
import DraftBoard from "./DraftBoard.jsx";
import Experts from "./Experts.jsx";
import PlayerTable from "./PlayerTable.jsx";
import Schedule from "./Schedule.jsx";
import Sources from "./Sources.jsx";
import ModelLab from "./ModelLab.jsx";
import Market from "./Market.jsx";
import MyTeam from "./MyTeam.jsx";
import Dashboard from "./Dashboard.jsx";

/* ============================================================
   FLIPARNIR — FALDIR, EKKI FJARLAEGDIR
   ============================================================
   Notandinn: "Thad ma svo fela alla flipa sem eg er ekki ad nota …
   eg mun bara vilja sja Draft og svo dashbordid … Annad ma fela en
   NOTA I BAKGRUNNI."

   Sidasti hlutinn er allt sem thetta snyst um. Flipi sem er FJARLAEGDUR
   tekur med ser tolur sem hitt appid les: `Model lab` er thar sem
   maelingarnar sjalfar bua (hvada deildarlogun voru profadar, forskotid
   gegn ADP), `Sources` er thad eina sem SYNIR thegar heimild brestur, og
   `Experts` ber nakvaemnina sem `sharpDelta` a bordinu er reiknad ur.
   Ad fela thau er birtingar-akvordun; ad fjarlaegja thau vaeri
   likans-akvordun, og hun var ekki tekin.

   ÞESS VEGNA ER `hidden` FLAGG OG EKKI STYTTUR LISTI:
     · lykillinn er afram gildur i `nfl_view`, svo vistad flipaheiti
       verdur ekki ogilt (thad gaf AUDAN SKJA einu sinni — sja nedar)
     · `need(...)`-letihledslan er obreytt, svo gognin eru afram sott
       thegar thau eru bedin
     · faldi flipinn er afram NAANLEGUR gegnum "More", svo ekkert
       verdur ostradanlegt i thogn. Vordur sem enginn getur opnad er
       ekki vordur.                                                   */
const TABS = [
  ["draft", "🏈 Draft"],
  ["home", "🏠 Dashboard"],
  /* `myteam` er FALIN en EKKI FJARLAEGD. Forsidan svarar somu spurningu
     fyrir BADAR deildir; `MyTeam` ber hins vegar `benchRegret` (var
     bekkurinn oheppni eda villa?), sem kviknar fyrst thegar vika er
     lidin og er ekki a forsidunni. Ad fjarlaegja hana vaeri ad henda
     maelingu sem ekki hefur enn haft faeri a ad birtast. */
  ["myteam", "⭐ My team", true],
  ["players", "👥 Players", true],
  ["experts", "🧠 Experts", true],
  ["market", "💰 Market", true],
  ["lab", "🔬 Model lab", true],
  ["schedule", "📅 Schedule", true],
  ["sources", "🔌 Sources", true],
];

export default function App() {
  /* VISTAD FLIPAHEITI VERDUR AD VERA FLIPI SEM ER TIL.
     `nfl_view = "eitthvad-annad"` gaf AUDAN SKJA — hver `view === k`
     grein var osonn, svo ekkert var teiknad nema flipastikan. Og thad
     var varanlegt: gildid situr i vafranum og fer hvergi. Flipi sem
     hverfur i endurskrifun (eda gamalt heiti ur eldri utgafu) hefdi
     gert nakvaemlega thad sama vid notanda sem hafdi hann opinn. */
  const [view, setView] = useState(() => {
    const saved = D.loadState("view", "draft");
    return TABS.some(([k]) => k === saved) ? saved : "draft";
  });
  /* ============================================================
     FLEIRI EN EIN DEILD — OG ASTANDID FYLGIR HVERRI
     ============================================================
     Adur bar appid EINA deild. Notandi i thremur deildum thurfti ad
     slá stillingum inn upp a nytt vid hverja svissun, og verra: hann
     hefdi haldid AFRAM ad nota borðið sem var reiknad ur annarri
     deild an ad sja thad, thvi tolurnar lita eins ut.

     Hver faersla ber allt sem deildin er:
       { id, name, rules, imported, warnings, sync }
     `rules` fer alltaf gegnum `normalizeLeague`, svo ein onyt faersla
     kostar bara sig sjalfa.

     `imported`, `warnings` og `sync` bua HER, ekki inni i
     `DraftBoard`, af tveimur astaedum: (a) tha lifa reglu-yfirlitid,
     lidsheitin og saetid ENDURHLEDSLU — adur hurfu thau vid F5 thott
     deildin sjalf vaeri vistud, sem las eins og "innflutningurinn
     tyndist"; (b) `DraftBoard` er endurraest (`key`) vid svissun, svo
     hvad sem lifir bara i honum myndi hverfa i nakvaemlega thvi
     augnabliki sem ny deild er flutt inn.                           */
  const [entries, setEntries] = useState(loadEntries);
  const [activeId, setActiveId] = useState(() => {
    const saved = D.loadState("activeLeague", "");
    return entries.some((e) => e.id === saved) ? saved : entries[0].id;
  });

  useEffect(() => { D.saveState("leagues", entries); }, [entries]);
  useEffect(() => { D.saveState("activeLeague", activeId); }, [activeId]);

  const active = entries.find((e) => e.id === activeId) || entries[0];
  const league = active.rules;

  const setSync = useCallback((next) => {
    setEntries((prev) => prev.map((e) => (e.id === activeId
      ? { ...e, sync: normalizeSync(typeof next === "function" ? next(e.sync) : next) }
      : e)));
  }, [activeId]);

  /* Innflutningur baetir vid — hann SKIPTIR EKKI UT. Deild sem er
     flutt inn tvisvar uppfaerist a sinum stad (reglur geta breytst i
     Sleeper) i stad thess ad tvitakast. */
  const importLeague = useCallback((entry) => {
    setEntries((prev) => {
      const rest = prev.filter((e) => e.id !== entry.id);
      /* Otoludi sjalfgefni hlekkurinn er skipt ut fremur en safnad:
         "My league" sem notandinn hefur aldrei hreyft er daudur flipi
         um leid og raunveruleg deild er komin. Hafi hann breytt honum
         er hann RAUNVERULEG stilling og fær ad standa. */
      const keep = rest.filter((e) => !(e.id === LOCAL_ID && isPristine(e)));
      const prevEntry = prev.find((e) => e.id === entry.id);
      return [...keep, { ...entry, sync: entry.sync || (prevEntry && prevEntry.sync) ||
                                          { draftId: "", slot: null } }].slice(-8);
    });
    setActiveId(entry.id);
  }, []);

  const removeLeague = useCallback((id) => {
    D.dropScopedState(id);
    setEntries((prev) => {
      const rest = prev.filter((e) => e.id !== id);
      /* Deildarlaust app er ekki app. Se sidustu deild lokad kemur
         sjalfgefna stillingin i staðinn — tom skel vaeri hvitur skjar
         med odrum formerkjum. */
      const out = rest.length ? rest : [freshLocal()];
      setActiveId((cur) => (cur === id ? out[0].id : cur));
      return out;
    });
  }, []);
  /* ============================================================
     SLEEPER-AUDKENNI NOTANDANS BYR HER, EKKI I DRAFT-FLIPANUM
     ============================================================
     Notandanafnid var i `SleeperSync` og HVARF vid endurhledslu. Thad
     var i lagi thar — draft-flipinn tharf thad adeins til ad finna
     deildina — en forsidan tharf thad til ad vita HVER AF TIU LIDUM ER
     MITT, og hun er su sida sem notandinn opnar i hverri viku. An thess
     yrdi hann ad slá nafnid inn upp a nytt i hvert sinn, eda forsidan
     yrdi ad giska, og gisk um "hvada lid er thitt" setur hop annars
     manns a skjainn.

     Vistad er `user_id` (snjokornid) OG nafnid: audkennid er stodugt en
     nafnid er thad sem notandinn les. `myRosterId` i `standings.js`
     tekur vid hvoru sem er. */
  const [sleeperUser, setSleeperUser] = useState(
    () => D.loadState("sleeperUser", { name: "", userId: null }));
  useEffect(() => { D.saveState("sleeperUser", sleeperUser); }, [sleeperUser]);

  /* `showAll` er VILJANDI EKKI VISTAD. Notandinn bad um ad hitt vaeri
     falid; vaeri thad vistad myndi ein heimsokn i `Model lab` gera thad
     synilegt ad eilifu og beidnin snerist vid af sjalfu ser. */
  const [showAll, setShowAll] = useState(false);
  const [core, setCore] = useState(null);
  const [err, setErr] = useState(null);
  const [extra, setExtra] = useState({});      // letihladnar skrar

  useEffect(() => { D.saveState("view", view); }, [view]);

  /* ---- kjarna-hledsla ----
     `alive`-flagg i stad AbortController. Skyndiminnid i `data.js`
     er DEILT milli allra sem kalla, svo loford sem er hætt vid er
     eitrað fyrir naesta lesanda — og React StrictMode kallar thessa
     lykkju TVISVAR i throun. Sja notuna vid `load()`. */
  useEffect(() => {
    let alive = true;
    D.loadCore()
      .then((c) => {
        if (!alive) return;
        if (!c.players) setErr("Could not load players.json — see Sources.");
        setCore(c);
      })
      .catch((e) => { if (alive) setErr(String(e)); });
    return () => { alive = false; };
  }, []);

  /* ---- letihledsla eftir flipa ----
     Flipinn segir hvad tharf. Ad saekja allt vid raesingu vaeri 8 MB
     adur en fyrsta talan birtist; svona kemur draft-bordid upp a
     1,4 MB og hitt bætist vid thegar spurt er um thad. */
  const need = useCallback(async (keys) => {
    const missing = keys.filter((k) => !(k in extra));
    if (!missing.length) return;
    const loaders = {
      seasons: D.loadSeasons, accuracy: D.loadAccuracy, experts: D.loadExperts,
      defense: D.loadDefense, teamForm: D.loadTeamForm, calibration: D.loadCalibration,
      adp: D.loadAdp,
      /* Vistud SEM FOLL, ekki kollud strax — `need()` kallar thau.
         Fyrsta utgafan skrifadi `D.loadEval("ppr")` sem er KALL og
         skiladi lofordi; `loaders[k]()` reyndi tha ad kalla lofordid
         sem fall og flipinn stod tomur. */
      marketHistory: () => D.loadMarketHistory(),
      news: () => D.loadNews(),
      evalPpr: () => D.loadEval("ppr"), evalStd: () => D.loadEval("standard"),
      stratPpr: () => D.loadStrategy("ppr"), stratStd: () => D.loadStrategy("standard"),
      arankPpr: () => D.loadArank("ppr"), arankStd: () => D.loadArank("standard"),
      arankFfPpr: () => D.loadArankFf("ppr"), arankFfStd: () => D.loadArankFf("standard"),
      kickers: () => D.loadKickers(),
      shapes: () => D.loadShapes(),
    };
    const got = await Promise.all(missing.map((k) => loaders[k]()));
    setExtra((prev) => {
      const next = { ...prev };
      missing.forEach((k, i) => { next[k] = got[i]; });
      return next;
    });
  }, [extra]);

  useEffect(() => {
    /* `shapes` fylgir draft-flipanum THVI innflutt deild verdur ad
       geta sagt hvort LOGUN hennar var maeld. Notandi i 10-lida deild
       med tveimur FLEX-saetum a rett a ad vita hvort tolurnar hans voru
       nokkurn timann profadar — 8,9 KB er ekki verdid a thvi ad thegja. */
    if (view === "draft") need(["seasons", "accuracy", "experts", "kickers", "shapes"]);
    else if (view === "players") need(["seasons", "accuracy", "experts"]);
    else if (view === "experts") need(["accuracy", "experts"]);
    /* E6: `Schedule` tekur hvorki `defense` ne `teamForm` vid — thaer
       voru sottar og sendar inn sem eiginleikar sem hun destrukturerar
       ekki einu sinni. Tvaer daudar netsoknir i hverri heimsokn. */
    else if (view === "schedule") need([]);
    else if (view === "sources") need(["calibration", "adp"]);
    else if (view === "market") need(["marketHistory"]);
    else if (view === "myteam") need(["seasons", "accuracy", "experts", "news", "defense"]);
    /* Forsidan tharf `defense` (vorn gegn stodu -> viku-spa) og
       `seasons`/`accuracy`/`experts` thvi `buildRows` byggir `vbd` og
       `aRank` ur theim, og BADIR waiver-listinn og start/sit hanga a
       theim tolum. `kickers` fylgir thvi 10-lida deildin BER
       spyrnumann og vorn — sú deild tharf thau saeti fyllt. */
    else if (view === "home") need(["seasons", "accuracy", "experts", "defense",
                                    "news", "kickers"]);
    else if (view === "lab") need(["evalPpr", "evalStd", "stratPpr", "stratStd", "arankPpr", "arankStd",
                            "arankFfPpr", "arankFfStd", "shapes"]);
  }, [view, need]);

  /* ---- rodirnar ---- */
  const built = useMemo(() => {
    if (!core || !core.players) return { rows: [], meta: {} };
    return buildRows({
      players: core.players,
      seasons: extra.seasons,
      accuracy: extra.accuracy,
      experts: extra.experts,
      schedule: core.schedule,
      market: core.market,
      league,
    });
  }, [core, extra.seasons, extra.accuracy, extra.experts, league]);

  if (err && !core) {
    return <div className="shell"><div className="empty">
      <h2>Gögnin hlóðust ekki</h2><p className="dim">{err}</p>
    </div></div>;
  }
  if (!core) {
    return <div className="shell"><div className="empty">Loading…</div></div>;
  }

  const meta = core.meta || {};
  const preseason = meta.seasonType === "pre" || meta.seasonType === "off";

  return (
    <div className="shell">
      <header className="top">
        <div className="brand">
          NFL Fantasy
          <span>{meta.season} · {preseason ? "preseason" : `week ${meta.week}`}</span>
        </div>
        <div className="spacer" />
        <ActiveLeague entry={active} />
      </header>

      <LeagueSwitcher entries={entries} activeId={activeId}
        onPick={setActiveId} onRemove={removeLeague} />

      <nav className="tabs" style={{ marginBottom: 14 }}>
        {/* Faldi flipinn er SYNDUR ef hann er sa sem er opinn — annars
            hyrfi stikan undan notandanum um leid og hann opnadi hann
            gegnum "More", og virki flipinn vaeri hvergi merktur. */}
        {TABS.filter(([k, , hidden]) => !hidden || showAll || view === k)
          .map(([k, lbl]) => (
            <button key={k} className={`tab${view === k ? " on" : ""}`}
              onClick={() => setView(k)}>{lbl}</button>
          ))}
        {!showAll && (
          <button className="tab" onClick={() => setShowAll(true)}
            title="Players, Experts, Market, Model lab, Schedule, Sources">
            … More
          </button>
        )}
        <a className="tab" href="../" style={{ textDecoration: "none" }}>⚽ FPL</a>
      </nav>

      {/* ============================================================
          `key` ER EKKI SKRAUT HER.
          ============================================================
          `taken` og `myPicks` eru lesin i `useState`-upphafsgildi, sem
          keyrir ADEINS vid mount. An `key` heldi bordid hopnum ur fyrri
          deildinni eftir svissun — leikmenn strikadir ut i deild sem
          thu tokst tha ekki i, og "hvern a ad taka naest" myndi telja
          hop sem thu eigir ekki. Endurraesing er retta hegdunin: nytt
          draft, nytt bord.                                            */}
      {view === "draft" && (
        <DraftBoard key={activeId} leagueKey={activeId}
          sleeperUser={sleeperUser} setSleeperUser={setSleeperUser}
          rows={built.rows} meta={built.meta} league={league}
          sync={active.sync} setSync={setSync}
          imported={active.imported} warnings={active.warnings}
          teams={active.teams}
          onImportLeague={importLeague}
          season={meta.season} accuracy={extra.accuracy}
          kickers={extra.kickers} shapes={extra.shapes} />
      )}
      {view === "home" && (
        <Dashboard entries={entries} rows={built.rows} meta={meta}
          schedule={core.schedule} defense={extra.defense}
          sleeperUser={sleeperUser.userId || sleeperUser.name || null} />
      )}
      {view === "players" && (
        <PlayerTable rows={built.rows} meta={built.meta} league={league} />
      )}
      {view === "experts" && (
        <Experts accuracy={extra.accuracy} experts={extra.experts}
          rows={built.rows} meta={built.meta} />
      )}
      {view === "myteam" && (
        <MyTeam key={activeId} leagueKey={activeId}
          rows={built.rows} league={league} news={extra.news} meta={meta}
          market={core.market} schedule={core.schedule} defense={extra.defense} />
      )}
      {view === "market" && (
        <Market market={core.market} rows={built.rows} meta={meta}
          history={extra.marketHistory} />
      )}
      {view === "lab" && (
        <ModelLab evalPpr={extra.evalPpr} evalStd={extra.evalStd}
          stratPpr={extra.stratPpr} stratStd={extra.stratStd} league={league}
          rows={built.rows} arankPpr={extra.arankPpr} arankStd={extra.arankStd}
          arankFfPpr={extra.arankFfPpr} arankFfStd={extra.arankFfStd}
          shapes={extra.shapes} />
      )}
      {view === "schedule" && (
        <Schedule schedule={core.schedule} teams={core.teams} season={meta.season} />
      )}
      {view === "sources" && (
        <Sources status={core.status} meta={meta} calibration={extra.calibration}
          adp={extra.adp} built={built} />
      )}
    </div>
  );
}

/* ============================================================
   DEILDARLISTINN — LESTUR, THVINGUN OG FLUTNINGUR
   ============================================================
   Sama regla og `normalizeLeague`: HVER REITUR ER THVINGADUR FYRIR
   SIG. Listinn kemur ur `localStorage` og blob i vafranum fer hvergi,
   svo eitt skakkt svid myndi annars fella appid vid HVERJA hledslu, ad
   eilifu — thad er nakvaemlega villan sem `saved-state.mjs` var
   skrifad fyrir. Faersla sem er onyt er SLEPPT; hinar standa.        */
const LOCAL_ID = "local";

const freshLocal = () => ({
  id: LOCAL_ID, name: "My league", rules: normalizeLeague({}),
  imported: null, warnings: [], teams: [], sync: { draftId: "", slot: null },
});

function normalizeSync(raw) {
  const s = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const slot = Math.round(Number(s.slot));
  return {
    draftId: typeof s.draftId === "string" ? s.draftId : "",
    slot: Number.isFinite(slot) && slot >= 1 && slot <= 32 ? slot : null,
  };
}

function normalizeEntry(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  if (typeof raw.id !== "string" || !raw.id) return null;
  return {
    id: raw.id,
    /* Heitid kemur UR SLEEPER og er thvi ovarid inntak. Tomt eda
       ekki-strengur faer fast heiti i stad thess ad birta "undefined"
       sem flipa. */
    name: typeof raw.name === "string" && raw.name.trim()
      ? raw.name.trim().slice(0, 60) : "League",
    rules: normalizeLeague(raw.rules),
    imported: raw.imported && typeof raw.imported === "object" &&
              !Array.isArray(raw.imported) ? raw.imported : null,
    /* LIDIN — thau eru VISTUD, og thad var akvordun sem var TEKIN
       TIL BAKA. Fyrst voru thau adeins i `SleeperSync` med theim rokum
       ad `/users` + `/rosters` se lifandi uppfletting og vistud mynd
       gaeti verid gomul. Su rok eru rett en thau brutu ADALLEIDINA:
       innflutningur breytir virku deildinni, sem endurraesir bordid, svo
       listinn hvarf i SOMU andra sem hann var lesinn — notandinn smellti
       "Connect" og saetavalid var farid. Stodugleiki vinnur ferskleika
       hér, og listinn er endurnyjadur i hverri tengingu. */
    teams: Array.isArray(raw.teams)
      ? raw.teams.map((t) => {
          if (!t || typeof t !== "object") return null;
          const slot = Math.round(Number(t.slot));
          return {
            slot: Number.isFinite(slot) && slot >= 1 && slot <= 32 ? slot : null,
            userId: typeof t.userId === "string" ? t.userId : null,
            name: typeof t.name === "string" && t.name.trim()
              ? t.name.trim().slice(0, 40) : "Unknown",
          };
        }).filter(Boolean).slice(0, 32)
      : [],
    warnings: Array.isArray(raw.warnings)
      ? raw.warnings.filter((w) => typeof w === "string").slice(0, 12) : [],
    sync: normalizeSync(raw.sync),
  };
}

function loadEntries() {
  const raw = D.loadState("leagues", []);
  const list = (Array.isArray(raw) ? raw : []).map(normalizeEntry).filter(Boolean);
  /* Tveir hlekkir med sama audkenni vaeru tveir flipar sem deila
     astandi — sami hopur, tvo nofn. */
  const seen = new Set();
  const uniq = list.filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)));
  if (uniq.length) return uniq.slice(0, 8);

  /* ENGINN LISTI ENN — flytjum gomlu EINU deildina inn.
     `nfl_league` var eitt objekt og `nfl_taken`/`nfl_myPicks`/`nfl_sync`
     voru olyklud. Notandi i midju drafti a ad halda thvi ollu. */
  const legacy = freshLocal();
  legacy.rules = normalizeLeague(D.loadState("league", {}));
  legacy.sync = normalizeSync(D.loadState("sync", {}));
  D.migrateScopedState(LOCAL_ID);
  return [legacy];
}

/** Ohreyfdur sjalfgefinn hlekkur — engin stilling, engin innflutning. */
function isPristine(e) {
  return !e.imported &&
         JSON.stringify(e.rules) === JSON.stringify(normalizeLeague({})) &&
         !(e.sync && e.sync.draftId);
}

/* ============================================================
   DEILDA-SVISSARINN
   ============================================================
   Hann birtist ADEINS thegar deildirnar eru fleiri en ein. Einn
   hlekkur sem heitir "My league" er ekki val heldur havadi, og rod af
   flipum sem ekki er haegt ad svissa milli les eins og bilun.

   HEITID ER MERKID. Notandinn thekkir deildina sina a nafni, ekki a
   audkenni — thess vegna er `name` ur Sleeper thad sem stendur a
   flipanum og saetið/stigagjofin fylgja sem smatt samhengi, svo tveir
   flipar med sama nafni (sama deild, tvo timabil) seu greinanlegir.   */
function LeagueSwitcher({ entries, activeId, onPick, onRemove }) {
  if (entries.length < 2) return null;
  /* ============================================================
     SAMNEFNDAR DEILDIR VERDA AD VERA GREINANLEGAR
     ============================================================
     Athugasemdin hér fyrir ofan fullyrdi ad `teams`/`scoring` gerdu
     "sama deild, tvo timabil" greinanleg. ÞAÐ VAR RANGT og thad sast i
     vafranum: 2026- og 2025-utgafur af "Patriots SB champs" eru BADAR
     10 lid og BADAR PPR, svo flipirnir voru **staffrettur eins**. Sami
     flokkur og fuzzy-liða-porunin sem felldi Man United inn i Man City:
     thogul samsomun er verri en engin.

     Timabilid er bara baett vid THEGAR nafnid rekst a — annars baeri
     hver flipi "2026" ad eilifu fyrir upplysingar sem eru alltaf thaer
     somu.                                                            */
  const nameCount = new Map();
  for (const e of entries) nameCount.set(e.name, (nameCount.get(e.name) || 0) + 1);

  /* `league-switch` er STODUGT MERKI fyrir prof. Fyrsta utgafa
     prófsins leitadi a nafni deildarinnar i OLLUM `.chip`-hnoppum og
     fann thridja hnapp — "DST New England Patriots" af bordinu sjalfu.
     Prof sem leitar a innihaldi i stad byggingar finnur thad sem thad
     var ekki ad leita ad. */
  return (
    <div className="chips league-switch" style={{ marginBottom: 10, alignItems: "center" }}>
      <span className="dim" style={{ fontSize: 12, marginRight: 2 }}>League</span>
      {entries.map((e) => {
        const on = e.id === activeId;
        const sc = e.rules.scoring === "half-ppr" ? "Half"
                 : e.rules.scoring === "standard" ? "Std" : "PPR";
        /* Timabilid ef til, annars sidustu 4 stafir audkennisins — sem
           er ekki fallegt en er SATT og einkvaemt. Tveir eins flipar
           eru thad hvorugt. */
        const dup = nameCount.get(e.name) > 1
          ? (e.imported && e.imported.season) || `…${e.id.slice(-4)}`
          : null;
        return (
          <span key={e.id} style={{ display: "inline-flex", alignItems: "center" }}>
            <button className={`chip${on ? " on" : ""}`} onClick={() => onPick(e.id)}
              title={`${e.rules.teams} teams · ${sc} · ${e.rules.rounds} rounds`}>
              {e.name}
              <span className="dim" style={{ marginLeft: 5, fontSize: 11 }}>
                {dup ? `${dup} · ` : ""}{e.rules.teams} · {sc}
              </span>
            </button>
            {/* Lokun er ADEINS a virku deildinni. Annars situr litid
                x vid hverja og eitt feilskot eydir drafti sem
                notandinn var ekki ad horfa a. */}
            {on && (
              <button className="chip" title={`Remove ${e.name}`}
                onClick={() => onRemove(e.id)}
                style={{ marginLeft: 2, padding: "2px 7px", lineHeight: 1 }}>×</button>
            )}
          </span>
        );
      })}
    </div>
  );
}

/* ============================================================
   VIRKA DEILDIN — LESIN, EKKI STILLT
   ============================================================
   HANDVIRKU REITIRNIR (Teams / Scoring / Superflex) VORU TEKNIR UT
   12.8.2026, ad beidni notandans, THVI DEILDIN ER NU FLUTT INN.
   Tveir reitir sem segja thad sama og innflutningurinn eru ekki bara
   ofthorf heldur HAETTA: sa sem hreyfir "Scoring" eftir innflutning
   reiknar deild sem er ekki lengur su sem Sleeper ber, og ekkert a
   skjanum segdi honum thad.

   ÞAD SEM MA EKKI FARA MED THEIM ER TALAN SJALF. `teams` og `scoring`
   raeda hvada ADP er lesid OG hvar varamanns-threpid liggur, svo
   notandinn verdur ad geta seð hvad bordid er ad reikna — annars er
   thetta svartur kassi. Reitirnir urdu thvi TEXTI, ekki ekkert.

   `imported` greinir "lesid ur Sleeper" fra "sjalfgefid". Deild sem
   var aldrei flutt inn ber sjalfgefnu 12-lida PPR-toluna, og THAD MA
   EKKI LESAST EINS OG DEILDIN THIN.                                */
function ActiveLeague({ entry }) {
  const L = entry.rules;
  const sc = L.scoring === "half-ppr" ? "Half PPR"
           : L.scoring === "standard" ? "Standard" : "PPR";
  const st = L.starters || {};
  const slots = ["QB", "RB", "WR", "TE", "FLEX", "SUPERFLEX", "K", "DST"]
    .filter((p) => st[p] > 0)
    .map((p) => (st[p] > 1 ? `${st[p]}${p}` : p)).join(" ");
  return (
    <div style={{ textAlign: "right", fontSize: 12.5, lineHeight: 1.45 }}>
      <div>
        <b>{L.teams}</b> teams · <b>{sc}</b> · <b>{L.rounds}</b> rounds
        {L.superflex ? <span className="good"> · superflex</span> : null}
      </div>
      <div className="dim" style={{ fontSize: 11.5 }}>
        {slots || "—"}
        {entry.imported
          ? <span className="good"> · from Sleeper</span>
          : <span className="warn"> · default, no league connected</span>}
      </div>
    </div>
  );
}
