/* ============================================================
   App.jsx — skelin. Flipar, deildarstillingar, gagnahledsla.
   ALLT reikni-vit er i `model.js` / `build.js` / `accuracy.js`.
   Thessi skra a ad vera BIRTING og ekkert annad.
   ============================================================ */

import React, { useEffect, useMemo, useState, useCallback } from "react";
import * as D from "./data.js";
import { buildRows, normalizeLeague } from "./build.js";
import { leagueFromSleeper, boardShape } from "./sleeper-league.js";
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
     fyrir BADAR deildir; `MyTeam` er geymd vegna `benchRegret` (var
     bekkurinn oheppni eda villa?).

     EN HUN ER EKKI TENGD OG ThESSI ATHUGASEMD SAGDI ANNAD (leidrett
     25.8.2026). Hér stod ad hun "kviknar fyrst thegar vika er lidin",
     sem les eins og hun geri thad SJALF. `benchRegret` er skrifud og
     profud i `src/lineup.js` en ENGIN skra i `src/` kallar hana, og
     thrennt vantar adur en hun getur skilad tolu:

       1. HVAD NOTANDINN BYRJADI I LIDINNI VIKU. `data.js` hefur engan
          `matchups`-endapunkt; `rosters` ber adeins `starters` EINS OG
          THEIR ERU NUNA, sem er onnur staerd en "hvad var i saetunum i
          viku 6".
       2. RAUNSTIGIN. `actual` kemur ur `data/weekly/{ar}.json`, sem er
          ekki til fyrir 2026 fyrr en vika er spilud.
       3. LOKIN VIKA. Engin er til.

     Ad fjarlaegja flipann vaeri samt ad henda maelingu sem hefur ekki
     enn haft faeri a ad birtast — thess vegna stendur hun. Vordur:
     `tests/lineup.mjs` kafli „benchRegret er OTENGD", sem SEFUR medan
     forsendurnar vantar og VAKNAR um leid og vikuskrain verdur til. */
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
  /* Bordid sem er i gangi: deildin ein thegar ekkert draft er tengt,
     deild+draft thegar thad er. Sja `boardScope` i `data.js`. */
  const boardKey = D.boardScope(activeId, active.sync && active.sync.draftId);

  /* ============================================================
     SAETIS-HLIDID VAR HER OG ER FARID — MAELT, EKKI GISKAD (20.8.2026)
     ============================================================
     Hér stod hlid sem hreinsadi `slot` thegar `draftId` breyttist i
     annad ekki-tomt gildi. Rokin voru rett — nytt draft erfir aldrei
     saetid — en HLIDID GAT EKKI GERT SITT GAGN, og thad var maelt:

     Villan sem hun var skrifud gegn situr i `connect` (`DraftBoard.jsx`):

         slot: slot != null ? slot : sync.slot

     Hun kallar `setSync` med saetid GEFID BERUM ORDUM (5), svo
     `slotGiven` var satt og hlidid slokknadi. STOKKBREYTING SANNADI
     THAD: med thessu hlidi a sinum stad OG `keptSlot` afturkallad fellur
     `draft-live.mjs` kafli 18 med FJORUM fullyrdingum — hopurinn ber
     tvo leikmenn saetis 5, tolu-reiturinn ber "5", og setningin um ad
     saetid hafi ekki lesist hverfur. Nakvaemlega thad sem notandinn sa.

     OG SLOTGIVEN VAR NAUÐSYNLEGT: an thess hefdi hlidid hreinsad saeti
     sem `resolveSlot` LEYSTI RETT fyrir nyja draftid. Hlidid var thvi
     BYGGINGARLEGA ofaert um ad greina "rett leyst saeti" fra "erft
     saeti" — badir koma sem tala i sama kalli.

     VIÐ ThAD BAETIST AD LEIDIN SEM SKIPTIR MALI FER EKKI HER UM: deild
     med drafti fer gegnum `onImportLeague` (`importLeague` nedar), sem
     skrifar `entry.sync` BEINT og kemur aldrei vid `setSync`. Hlid a
     `setSync` gat thvi ekki verið vorn a theirri leid — sem er einmitt
     leidin sem raundraftid fer.

     LAUSNIN ER A EINUM STAD, ThAR SEM SAETID ER AKVEDID: `keptSlot` i
     `connect` (`DraftBoard.jsx`, vordur `draft-live.mjs` 18). Tvo
     halfvirk lög lata naesta lesanda halda ad invariantid se varið hér
     — og thad er verra en eitt lag sem er.                          */
  const setSync = useCallback((next) => {
    setEntries((prev) => prev.map((e) => (e.id === activeId
      ? { ...e, sync: normalizeSync(typeof next === "function" ? next(e.sync) : next) }
      : e)));
  }, [activeId]);

  /* ============================================================
     HVER SAMSTILLING ER I GANGI — OG HVERS VEGNA HUN BYR HER
     ============================================================
     ÞETTA VAR `useState(false)` INNI I `SleeperSync` og thad var
     forsendan fyrir ThVI ad "Connect" og "Start live sync" thurftu ad
     vera TVEIR hnappar: innflutningur a deild breytir `activeId`, sem
     endurraesir `DraftBoard` (`key={activeId}`) — svo samstilling sem
     var kveikt i SOMU adgerd og innflutningurinn var slokkt adur en
     hun byrjadi. Notandinn thurfti thvi ad ytta aftur.

     Merkid er SKORDA (`boardScope`), ekki boolean, og thad gerir thrjar
     reglur ad einni linu:
       · svissad um deild  -> onnur skorða -> samstilling SLOKKNAR
       · nytt draft-audkenni -> onnur skorða -> slokknar (rett: hvert
         draft a sitt bord)
       · endurhledsla -> `null` -> ENGIN pollun sem enginn bad um

     ÞAD SIDASTA ER VORDUR, EKKI THAEGINDI: `audit.mjs` kafli 9 og
     `dashboard.mjs` kafli 1 banna berum ordum koll sem enginn kveikti a.
     Þess vegna er thetta EKKI vistad i `localStorage` — thad myndi
     byrja ad polla vid naestu hledslu.                                */
  const [liveScope, setLiveScope] = useState(null);

  /* ============================================================
     LOGUN DRAFTSINS BYR HER — ThVI `vbd` ER REIKNAD HER
     ============================================================
     Þetta astand var inni i `DraftBoard` og var ADEINS notad i
     snakk-staerdfraedina (naesta val, thak, litun). Þad var ekki nog:

       Hann tengdi 10-lida MOCK medan deildin i appinu stod a 12 lidum.
       Snakk-tolurnar voru rettar (thaer koma ur draftinu) en HVER VBD-
       TALA var reiknud fyrir 12 lid: varamanns-threpid WR29 -> WR42,
       +26,9 stig a hvern WR — og hann tok SEX WR i sjo umferdum og
       fylgdi radgjofinni i hverju vali.

     Mock-draft ber enga `league_id`, svo thar eru ENGAR reglur notandans
     ad yfirskrifa: draftid er eina heimildin, og hun ber `settings.teams`,
     `settings.rounds`, `settings.slots_*` OG `metadata.scoring_type`
     (maelt a lifandi API 20.8.2026). Þess vegna er logunin lyft hingad —
     `buildRows` er kallad HER, svo deild sem er leidd ut ur drafti getur
     ekki bara verid til inni i bordinu.

     SKORDA, EKKI BER HLUTUR: `DraftBoard` er endurraestur vid svissun
     (`key={activeId}`) en thetta astand er thad ekki, svo an skordunnar
     baeri ny deild AFRAM logun draftsins sem var slitid — og reiknadi
     VBD ur drafti sem er ekki tengt. Skordan er lesin I TEIKNINGU (ekki i
     effecti), svo hun getur ekki verid einni teikningu of sein.        */
  const [shapeState, setShapeState] = useState({ scope: null, shape: null });
  const onDraftShape = useCallback((next) => {
    setShapeState((prev) => {
      /* ============================================================
         AÐEINS ÞEGAR HUN BREYTIST — MÆLT, EKKI VARFAERNI
         ============================================================
         `pull` byr NYJAN hlut i hverri pollun, svo tilvisunin var alltaf
         ny og allt tred endurteiknadi sig — 200 rada tafla, skortstikan
         og radgjafarkassinn — a 1,5 sek fresti i beinni. `draft-live.mjs`
         (sem styttir pollunar-bidina i 6 ms) for ur ~20 sekundum i YFIR
         TOLF MINUTUR og var enn i fyrsta kafla.

         OG HVERT NYTT SVID VERDUR AD VERA I SAMANBURDINUM. Vaeri
         `leagueId`/`scoringType`/`slots` utan hans kaemu thau UPP i
         fyrstu pollun og aldrei aftur — hlidid sem sparar endurteikningu
         er lika hlid a upplysingunni (sama villa og `unknown` i
         `pickSignature`).                                              */
      const a = prev.shape, b = next || null;
      if (prev.scope === activeId && a === b) return prev;
      const same = !!a && !!b && a.teams === b.teams && a.rounds === b.rounds
        && a.type === b.type && a.status === b.status && a.leagueId === b.leagueId
        && a.scoringType === b.scoringType
        && JSON.stringify(a.slots) === JSON.stringify(b.slots);
      if (prev.scope === activeId && same) return prev;
      return { scope: activeId, shape: b };
    });
  }, [activeId]);
  const draftShape = shapeState.scope === activeId ? shapeState.shape : null;

  /* Hvad bordid reiknar med, og hvadan hvert svid kemur. Ein hrein
     uppspretta fyrir BADI tolurnar og stoduljosid. */
  const board = useMemo(() => boardShape({
    league,
    shape: draftShape,
    leagueId: (active.imported && active.imported.leagueId) || null,
  }), [league, draftShape, active.imported]);

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
  /* SAMA REGLA OG `imported`: hvert svid thvingad. `sleeperUser.name`
     for i `<input value={...}>` og i `myRosterId(...)`; hlutur eda tala
     thar er skokk gerd sem React kvartar undan og uppflettingin getur
     ekki notad. Ytri gerdin ein dugar ekki. */
  const [sleeperUser, setSleeperUser] = useState(() => {
    const u = D.loadState("sleeperUser", null);
    const o = u && typeof u === "object" && !Array.isArray(u) ? u : {};
    return {
      name: typeof o.name === "string" ? o.name.slice(0, 60) : "",
      userId: typeof o.userId === "string" && o.userId ? o.userId.slice(0, 40) : null,
    };
  });
  useEffect(() => { D.saveState("sleeperUser", sleeperUser); }, [sleeperUser]);

  /* `showAll` er VILJANDI EKKI VISTAD. Notandinn bad um ad hitt vaeri
     falid; vaeri thad vistad myndi ein heimsokn i `Model lab` gera thad
     synilegt ad eilifu og beidnin snerist vid af sjalfu ser. */
  const [showAll, setShowAll] = useState(false);
  const [core, setCore] = useState(null);
  const [err, setErr] = useState(null);
  const [extra, setExtra] = useState({});      // letihladnar skrar

  /* ============================================================
     REGLURNAR ERU ENDURLESNAR — EN EKKI VID RAESINGU
     ============================================================
     Vistadar reglur GETA ORDID URELTAR OG THOGULT. Maelt af
     maelinga-lotunni: Sofahetjur foru ur 10 lidum i 12 milli tímabila,
     og thad EITT faerir varamanns-threpid RB 27->32, WR 30->35, TE
     14->17, QB 10->12. 75 af topp 100 hreyfast, 29 um fjogur saeti eda
     meira, og Lamar Jackson fer ur 40 i 52. Ekkert a skjanum hefdi sagt
     fra thvi: 10 er fullgild deild og talan liti alveg rett ut.

     HVERS VEGNA THETTA ER HNAPPUR OG EKKI SJALFVIRKT:
     Fyrsta utgafan endurlas reglurnar thegar notandinn SVISSADI a
     draft-flipann, med theim rokum ad flipa-svissun se notanda-adgerd.
     TVO PROF FELLDU THAD OG THAU HOFDU RETT FYRIR SER:
       · `audit.mjs` kafli 9 sa **20** Sleeper-koll thar sem enginn var
         leyfdur — hann smellir a hvern flipa, svo hver heimsokn a
         draft-flipann varð net-kall til thridja adila
       · `dashboard.mjs` kafli 1 sa **2** koll VID RAESINGU, thvi
         effectid endurkeyrir i hvert sinn sem `rereadRules` er
         endurmyndud (hun haðist af `entries` og `extra.shapes`, sem
         breytast bædi meðan appid er ad hlada). `firstDraftView`-vordurinn
         slepptu adeins ALLRA fyrsta kallinu, ekki theim sem komu i
         naestu teikningum af sama mount-i.

     Fyrri villan er hin mikilvaega: flipa-svissun er WEAK evidence um ad
     notandinn vilji ad appid tali vid Sleeper. Vordurinn segir
     "notandinn hefur ekki bedid um thad, og pollun sem enginn kveikti a
     er baedi ovaent og donaleg vid gestgjafann" — og thad gildir um
     flipa-flakk alveg eins og um raesingu. Sjalfvirknin var MIN
     hugmynd, ekki notandans, og hun rakst a asettan vord.

     Thess vegna er thetta HNAPPUR ("re-read" vid innfluttu reglurnar).
     Hann er skyrt bod, hann er synilegur, og `Connect` endurles hvort ed
     er. Forsidan er annad mal: THAR eru Sleeper-gogn allt innihaldið, svo
     ad opna hana ER beidnin.

     Bresti kallid stendur VISTADA deildin. Thad er rett: gamlar reglur
     eru betri en engar, og bilunin er sogd i stad thess ad hverfa.     */
  const [rulesNote, setRulesNote] = useState(null);

  const rereadRules = useCallback(async (silent) => {
    const e = entries.find((x) => x.id === activeId);
    if (!e || !e.imported || !e.imported.leagueId) return;
    try {
      const bundle = await D.sleeperResolve(e.imported.leagueId);
      if (!bundle.league) return;
      const res = leagueFromSleeper({
        league: bundle.league, draft: bundle.draft, shapes: extra.shapes || null });
      const before = JSON.stringify(e.rules);
      const after = JSON.stringify(res.league);
      if (before === after) {
        setRulesNote(silent ? null : { kind: "same", text: "Rules re-read — unchanged." });
        return;
      }
      /* BREYTINGIN ER SOGD BERUM ORDUM, ekki bara framkvaemd. Deild sem
         skiptir um lidafjolda endurreiknar hverja tolu a bordinu, og
         notandi sem ser tolurnar hreyfast an skyringar hefur enga leid
         ad vita hvort thad var deildin eda villa. */
      const diffs = [];
      if (e.rules.teams !== res.league.teams) {
        diffs.push(`${e.rules.teams} -> ${res.league.teams} teams`);
      }
      if (e.rules.scoring !== res.league.scoring) {
        diffs.push(`${e.rules.scoring} -> ${res.league.scoring}`);
      }
      if (e.rules.rounds !== res.league.rounds) {
        diffs.push(`${e.rules.rounds} -> ${res.league.rounds} rounds`);
      }
      if (JSON.stringify(e.rules.starters) !== JSON.stringify(res.league.starters)) {
        diffs.push("starting slots changed");
      }
      setEntries((prev) => prev.map((x) => (x.id === e.id
        ? { ...x, rules: res.league, imported: res.imported, warnings: res.warnings }
        : x)));
      setRulesNote({ kind: "changed",
        text: `${e.name}: rules changed on Sleeper — ` +
              `${diffs.join(", ") || "settings differ"}. Every number on the board ` +
              `was recomputed.` });
    } catch (err) {
      setRulesNote({ kind: "fail",
        text: `Could not re-read the rules (${String(err.message || err)}). ` +
              `The stored rules are still in use.` });
    }
  }, [entries, activeId, extra.shapes]);


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
      /* VIKURNAR SEM ERU LIDNAR AF THESSU TIMABILI. `null` i forleik og
         thad er RETT SVAR — `data/weekly/2026.json` verdur ekki til fyrr
         en fyrsta vika er spilud, og `load()` skilar `null` vid 404.
         Adeins `home` og `myteam` bidja um hana; hun er ~1,4 MB. */
      weekly: () => D.loadWeekly((core && core.meta && core.meta.season) || null),
    };
    const got = await Promise.all(missing.map((k) => loaders[k]()));
    setExtra((prev) => {
      const next = { ...prev };
      missing.forEach((k, i) => { next[k] = got[i]; });
      return next;
    });
  }, [extra, core]);

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
    else if (view === "myteam") need(["seasons", "accuracy", "experts", "news", "defense", "weekly"]);
    /* Forsidan tharf `defense` (vorn gegn stodu -> viku-spa) og
       `seasons`/`accuracy`/`experts` thvi `buildRows` byggir `vbd` og
       `aRank` ur theim, og BADIR waiver-listinn og start/sit hanga a
       theim tolum. `kickers` fylgir thvi 10-lida deildin BER
       spyrnumann og vorn — sú deild tharf thau saeti fyllt. */
    else if (view === "home") need(["weekly", "seasons", "accuracy", "experts", "defense",
                                    "news", "kickers"]);
    else if (view === "lab") need(["evalPpr", "evalStd", "stratPpr", "stratStd", "arankPpr", "arankStd",
                            "arankFfPpr", "arankFfStd", "shapes"]);
  }, [view, need]);

  /* ---- rodirnar ---- */
  const buildFor = useCallback((lg) => {
    if (!core || !core.players) return { rows: [], meta: {} };
    return buildRows({
      players: core.players,
      seasons: extra.seasons,
      accuracy: extra.accuracy,
      experts: extra.experts,
      schedule: core.schedule,
      market: core.market,
      league: lg,
    });
  }, [core, extra.seasons, extra.accuracy, extra.experts]);
  const built = useMemo(() => buildFor(league), [buildFor, league]);
  /* BORDID FAER SINAR EIGIN RODIR **ADEINS** ef logun draftsins er onnur
     en deildarinnar — annars er thad SAMA tilvisunin og allt annad notar
     (`boardShape` skilar somu deild ohreyfdri), svo hvorki er reiknad
     tvisvar ne teiknad tvisvar. Aðrir flipar halda DEILDINNI: mock ma
     ekki endurskilgreina deildina sem notandinn spilar i. */
  const builtBoard = useMemo(() => (board.league === league
    ? built : buildFor(board.league)), [board.league, league, built, buildFor]);

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

      {rulesNote && (
        <div className={`note${rulesNote.kind === "same" ? "" : " warn"}`}
          style={{ marginTop: 0 }}>
          {rulesNote.text}
          <button className="act" style={{ marginLeft: 8, padding: "2px 8px", fontSize: 11.5 }}
            onClick={() => setRulesNote(null)}>dismiss</button>
        </div>
      )}

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
          rows={builtBoard.rows} meta={builtBoard.meta} league={board.league}
          draftShape={draftShape} onShape={onDraftShape} board={board}
          sync={active.sync} setSync={setSync}
          imported={active.imported} warnings={active.warnings}
          teams={active.teams}
          onImportLeague={importLeague} onRereadRules={() => rereadRules(false)}
          liveScope={liveScope} setLiveScope={setLiveScope}
          season={meta.season} accuracy={extra.accuracy}
          kickers={extra.kickers} shapes={extra.shapes} />
      )}
      {/* `buildFor` FYLGIR MED OG ThAD ER EKKI HAGRAEDING. `built.rows`
          er byggt ur `league` — EINNI deild — en forsidan teiknar KORT
          PER DEILD. Bæru oll kortin tolur virku deildarinnar vaeri hitt
          kortid reiknad RETT UR RONGU INNTAKI (maelt: midgildi |aRank| 9,
          |VBD| 25,4, og 75 K/DST-radir flakka milli tolu og null).
          `Dashboard` byggir thvi sinar eigin radir per deild — sja
          `LeagueCard`. Sama fall og bordid notar (`builtBoard`), svo
          thetta er ekki ny utfaersla. */}
      {view === "home" && (
        <Dashboard entries={entries} rows={built.rows} meta={meta}
          schedule={core.schedule} defense={extra.defense} news={extra.news}
          weekly={extra.weekly} buildFor={buildFor}
          sleeperUser={sleeperUser.userId || sleeperUser.name || null} />
      )}
      {view === "players" && (
        <PlayerTable rows={built.rows} meta={built.meta} league={league} />
      )}
      {view === "experts" && (
        <Experts accuracy={extra.accuracy} experts={extra.experts}
          rows={built.rows} meta={built.meta} />
      )}
      {/* HOPURINN ER LESINN UR SAMA BORDI OG DRAFTID SKRIFAR. `MyTeam`
          les `myPicks` og skrifar thad aldrei; skrifadi hann `DraftBoard`
          undir deildinni EINNI en bordid undir draftinu (sja `boardScope`
          i `data.js`) vaeri flipinn ad lesa lykil sem enginn skrifar
          lengur og hopurinn vaeri TOMUR eftir alvoru draft. Lykillinn er
          leiddur ut a EINUM stad og sendur hingad, ekki reiknadur upp a
          nytt — tvaer utfaerslur af somu skorðun er nakvaemlega thad sem
          `buildTeamMetrics` kostadi i FPL-appinu.

          `key` fylgir med: `ids` er lesid i `useState`-upphafsgildi. */}
      {view === "myteam" && (
        <MyTeam key={boardKey} leagueKey={boardKey}
          rows={built.rows} league={league} news={extra.news} meta={meta}
          market={core.market} schedule={core.schedule} defense={extra.defense}
          weekly={extra.weekly}
          sleeperUser={sleeperUser.name || ""} />
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

/* ============================================================
   `imported` — HVERT SVID ER ÞVINGAD, EKKI BARA YTRI GERDIN
   ============================================================
   Þetta var ADEINS `typeof raw.imported === "object"`, sem er
   NAKVAEMLEGA sama villan og FPL-appid greiddi fyrir (CLAUDE.md kafli 8:
   "gilt JSON med RANGRI GERD for ospurt inn i state" — `benchSwaps`
   `{"1":"x"}` er gildur hlutur en `"x".forEach` fellur).

   Maelt a 5 blobbum og FJOGUR ollu villu — allt fjögur i BIRTINGU, thar
   sem villuvornin er eina urraedid:

     · `status: 3`          -> `im.status.replace is not a function`
     · `flexPos: "RB/WR"`   -> `im.flexPos.join is not a function`
     · `leagueId: 12345`    -> `im.leagueId.slice is not a function`
     · `name: { a: 1 }`     -> birtist sem `[object Object]` sem flipi

   OG UTGANGAN ER SU DYRASTA I APPINU. `loadEntries` les `localStorage`
   beint inn i state og hleðslan skrifar blobbid AFTUR ur, byte fyrir
   byte — svo oheilt svid felldi appid vid HVERJA hledslu, ad eilifu.
   Eini hnappurinn hreinsar alla `nfl_*`-lykla: ALLAR deildir, allt
   bordid, allt saetavalid. Þess vegna ma eitt skokk svid adeins kosta
   SIG SJALFT.

   OG ÞAD GETUR LEGID I DVALA. `imported` er lesid a Draft-flipa VIRKU
   deildarinnar; oheilt svid i deild 2 gerir ekkert fyrr en notandinn
   svissar — og tha er engin adgerd til ad tengja hrunid vid.

   Vordur: `tests/saved-state.mjs` kafli 6, sem profar bædi ATTIRNAR:
   skokk svid ma ekki komast inn, OG GILT `imported` VERDUR AD FARA
   OBREYTT I GEGN — annars vaeri "lagfaeringin" ad henda innfluttu
   reglunum sem notandinn kom med.                                   */
function str(v, max) {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
}
function posInt(v, max) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 && n <= max ? n : null;
}
export function normalizeImported(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  /* `leagueId` ER BURDARVIRKID, ekki skraut: `Dashboard` sier eftir
     honum og `sleeperResolve` sekir eftir honum. Vanti hann er thetta
     ekki innflutt deild og `null` er retta svarid — ekki hluta-hlutur
     sem lítur innfluttur ut. */
  const leagueId = str(raw.leagueId, 40);
  if (!leagueId) return null;
  return {
    leagueId,
    draftId: str(raw.draftId, 40),
    name: str(raw.name, 60),
    season: str(raw.season, 8),
    status: str(raw.status, 32),
    draftStatus: str(raw.draftStatus, 32),
    draftType: str(raw.draftType, 32),
    teams: posInt(raw.teams, 32),
    rounds: posInt(raw.rounds, 40),
    scoring: ["ppr", "half-ppr", "standard"].includes(raw.scoring)
      ? raw.scoring : null,
    rec: Number.isFinite(Number(raw.rec)) ? Number(raw.rec) : null,
    exactScoring: !!raw.exactScoring,
    superflex: !!raw.superflex,
    bench: posInt(raw.bench, 40),
    /* Urslitakeppnin — `standingsFrom` les thau (sja `sleeper-league.js`). */
    playoffTeams: posInt(raw.playoffTeams, 32),
    playoffWeekStart: posInt(raw.playoffWeekStart, 25),
    /* `starters` er hlutur af TOLUM. Fylki er gildur hlutur i JS, svo
       ytri gerdin ein dugar ekki — sama gildran og `benchSwaps`. */
    starters: raw.starters && typeof raw.starters === "object" &&
              !Array.isArray(raw.starters)
      ? Object.fromEntries(Object.entries(raw.starters)
          .filter(([k, v]) => typeof k === "string" && posInt(v, 20) != null)
          .map(([k, v]) => [k.slice(0, 12), posInt(v, 20)]))
      : {},
    flexPos: Array.isArray(raw.flexPos)
      ? raw.flexPos.filter((p) => typeof p === "string").slice(0, 8) : null,
    orderDrawn: !!raw.orderDrawn,
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
    imported: normalizeImported(raw.imported),
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
