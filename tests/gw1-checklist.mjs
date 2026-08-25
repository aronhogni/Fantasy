/* ============================================================
   GW1-VÖKULISTI — sefur í forleik, VAKNAR þegar fyrsta umferðin klárast

   AF HVERJU: CLAUDE.md geymir ~6 dreifðar athugasemdir um hluti sem
   „á að athuga þegar GW1 klárast" — kóða sem kviknar einn morgun eftir
   margra vikna svefn. Sá morgunn er einmitt þegar enginn man eftir
   athugasemdunum. Þetta safn gerir þær að VÉLRÆNUM staðhæfingum:
   í forleik prófar það að svefnstaðan sé samkvæm sjálfri sér; frá og
   með fyrstu LOKNU umferð fellur það ef einhver heimildanna vaknaði ekki.

   Þetta er sama hugsun og vörðurinn um dauða markaðsliðinn (kafli 3 í
   CLAUDE.md): kerfi sem „virkar" af því að enginn mælir það er ekki
   vitað að virki. Dagurinn sem þetta safn fyrst FELLUR er dagurinn sem
   það borgar sig.

   Keyrsla:  node tests/gw1-checklist.mjs
   ============================================================ */
import { readFileSync, existsSync } from "node:fs";
import { playedGwIds } from "../scripts/fetch.mjs";

/* GW1_DATA_DIR: vakandi greinin hefur ALDREI keyrt á raungögnum fyrr en
   22. ágúst — hún er því prófuð á TILBÚNUM gögnum (sjá sjálfsprófunina
   neðst) og umhverfisbreytan gerir það mögulegt án þess að hrófla við
   data/. Í venjulegri keyrslu er hún ósett og repo-gögnin lesin.        */
const D = process.env.GW1_DATA_DIR
  ? process.env.GW1_DATA_DIR.replace(/\/?$/, "/")
  : new URL("../data/", import.meta.url).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));

let pass = 0, fail = 0;
const ok = (c, n) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };

console.log(`\n${"=".repeat(84)}`);
console.log("GW1-VÖKULISTI — heimildir sem eiga að vakna með tímabilinu");
console.log("=".repeat(84));

const events = J("events.json").events;
/* ============================================================
   KLUKKAN ER SU SAMA SEM PIPELINE-AN NOTAR (25.8.2026)

   Hun var `events.filter(e => e.finished)` — SJOUNDI stadurinn med thann
   gata, og sa sem var erfidastur ad sja thvi hann er i PROFI og ekki i
   byggjanda. FPL flettir `finished` ekki fyrr en bonus er stadfestur, svo
   MAELT i dag: GW1 ber `finished: false` medan ALLIR TIU leikir hennar eru
   bunir OG pipeline-an hefur skrifad gognin (`defcon.players` 200 radir,
   `player_form.gws_used` 1).

   Vokulistinn tok thvi FORLEIKS-GREININA og fullyrti ad skrarnar vaeru
   TOMAR — um skrar sem eru fullar. Prof sem spyr annarrar spurningar en
   sa kodi sem thad profar getur ekki verid rett: `playedGwIds` er flutt
   inn ur `scripts/fetch.mjs`, svo baedi lesa SAMA skilyrdi.           */
/* VANTI LEIKJASKRAIN FELLUR KLUKKAN A `finished` — OG SEGIR ThAD.
   `J` kastar a vantandi skra, og hrun i vokulista er ekki fall heldur
   ThOGN (CLAUDE.md 5b: allar fullyrdingar a eftir hverfa). Varaleidin er
   gamla skilyrdid, sem er RETT thegar thad er eina sem er til — en hun er
   PRENTUD svo "engin leikjaskra" geti ekki litid ut eins og "engin umferd
   spilud".                                                             */
let fixturesForClock = null;
try { fixturesForClock = J("fixtures.json"); } catch { fixturesForClock = null; }
if (!fixturesForClock) console.log("  ATH: fixtures.json vantar — klukkan fellur a `finished`");
const finished = fixturesForClock
  ? playedGwIds(events, fixturesForClock)
  : events.filter(e => e.finished).map(e => e.id);
const finishedGw = finished.length ? Math.max(...finished) : 0;
console.log(`  loknar umferðir: ${finished.length} (síðasta: ${finishedGw || "engin"})`);

/* Grunnstoðirnar þrjár verða að vera grænar í status.json á ÖLLUM
   árstímum — allt annað í appinu hangir á þeim.                        */
const status = J("status.json");
const src = status.sources || status;
for (const k of ["fpl_bootstrap", "fpl_fixtures", "fpl_live"]) {
  ok(src[k]?.ok === true, `grunnstoð ${k} er græn í status.json`);
}

if (finishedGw === 0) {
  /* ---------- FORLEIKUR: svefnstaðan á að vera SAMKVÆM ---------- */
  console.log(`\n${"─".repeat(84)}`);
  console.log("FORLEIKUR — engin lokin umferð; prófað að svefnstaðan sé samkvæm");
  console.log("─".repeat(84));

  const pf = J("player_form.json");
  ok(Object.keys(pf.players || {}).length === 0,
    "player_form er tómt (mínútuþróun kviknar við GW4, ekki fyrr)");
  const dc = J("defcon.json");
  ok((dc.players || []).length === 0,
    "defcon.players er tómt (hittni krefst leikja)");
  const im = J("imminent.json");
  ok(im.archive === true,
    "imminent er merkt ARCHIVE (mó/aó úr lokum fyrra tímabils, ekki látið sem nýtt)");
  const sb = J("season_baseline.json");
  /* ÞESSI FULLYRÐING LIFÐI ÞAÐ SEM HÚN Á AÐ VERJA (leiðrétt 21.8.2026).
     `label` er LEITT af ári frestarins og `players.length` fór úr 599 í
     600 — svo þegar keyrslan 21.8. kl. 23:28 skrifaði **2026/27-tölur**
     (max starts 1) ofan á **2025/26-lokatölur** (max starts 38) stóðust
     BÁÐIR liðirnir og hér prentaðist grænt tikk ofan á horfnum gögnum.
     Einbreytan sem greinir ástöndin í sundur er `starts`: lokið tímabil
     hefur menn með ~38, nýtt hefur ≤1. Sjá `seasonBaselineDecision` í
     `scripts/fetch.mjs` og `tests/fetch-entry.mjs` kafla 5, þar sem
     ÁKVÖRÐUNIN sjálf er prófuð á tilbúnum inntökum.                    */
  const sbStarts = Math.max(0, ...(sb.players || [])
    .map(r => Number(r?.starts)).filter(Number.isFinite));
  ok(sb.label && (sb.players || []).length > 400 && sbStarts >= 20,
    `season_baseline ber LOKIÐ fyrra tímabil (${sb.label}, `
    + `${(sb.players || []).length} leikmenn, max starts ${sbStarts})`);
  /* SÉRFRÆÐINGA-HÓPURINN. Í forleik á hópurinn AÐ VERA TIL (hann er
     byggður úr sögulegum ferlum, ekki úr þessu tímabili) en það sem hann
     GERÐI á ekki að vera til — picks eru 404 fyrir fyrsta frest.        */
  const pros = J("pros.json");
  ok((pros.panel || []).length >= 500,
    `pros.json ber hópinn (${(pros.panel || []).length} stjórnendur)`);
  /* VIÐMIÐSHÓPURINN er ekki skraut: án hans er „bekkurinn kostar 17,0"
     merkingarlaus tala, því FPL gefur viðmið fyrir eignarhald og EKKERT
     annað. Hann er valinn einu sinni og fastur — vanti hann er hver
     samanburðartala í flipanum ómarktæk.                                */
  ok((pros.control || []).length >= 500,
    `pros.json ber VIÐMIÐSHÓPINN (${(pros.control || []).length} slembnir)`);
  {
    const p2 = new Set(pros.panel.map(x => x.id));
    ok(!(pros.control || []).some(id => p2.has(id)),
      "viðmiðshópurinn skarast EKKI við hópinn (annars væri hann ekki viðmið)");
  }
  /* TVEIR KLUKKUR, EKKI EIN — og þessi fullyrðing sat á öfugum stað
     (lagað 21.8.2026). Safnið greinir á `finishedGw` (er umferð LOKIÐ?),
     en `collectPros` gengur eftir **FRESTINUM**, ekki eftir úrslitum:
     `entry/{id}/event/{gw}/picks/` svarar 404 þar til frestur er liðinn og
     virkar um leið og hann er. Kl. 17:30 í dag opnaðist því ástand sem
     hvorug greinin átti — frestur liðinn, engin umferð lokin — og
     fullyrðingin „pros_gw.json er EKKI til" varð ósönn án þess að nokkuð
     væri að. Þetta er nákvæmlega miðju-ástandið sem `clock-states.mjs`
     skjalar (A: frestur liðinn, engin úrslit).
     Hún les nú SÍNA EIGIN klukku og fullyrðir BÁÐAR áttir.               */
  const dlPassed = events.filter(e => e.deadline_time
    && Date.now() >= new Date(e.deadline_time).getTime()).length;
  if (!dlPassed) {
    ok(!existsSync(`${D}pros_gw.json`),
      "engin frestur liðinn -> pros_gw.json er EKKI til (picks svara 404)");
  } else {
    /* FYRSTA RAUNKEYRSLA HÓPSINS EVER. CLAUDE.md kafli 10 skjalar að hún
       hafi enga generalprufu, svo hér er hún mæld í fyrsta sinn.         */
    ok(existsSync(`${D}pros_gw.json`),
      `frestur ${dlPassed} liðinn -> pros_gw.json Á að vera til`);
    if (existsSync(`${D}pros_gw.json`)) {
      const pg = JSON.parse(readFileSync(`${D}pros_gw.json`, "utf8"));
      const rows = Object.values(pg.gw || {});
      const n = rows[0]?.n ?? 0;
      const size = pg.panel_size || (pros.panel || []).length || 1;
      ok(rows.length >= 1, `pros_gw.json ber ${rows.length} umferð(ir)`);
      ok(n / size >= 0.9,
        `þekjan er ${n} af ${size} (${(100 * n / size).toFixed(1)}%) — þarf >=90%`);
      /* n MÁ ALDREI VERA 0: röð með n:0 er nákvæmlega það sem
         `collectPros` er skrifað til að forðast (sjá kafla 7).           */
      ok(n > 0, "og engin röð með n:0 (tóm röð má ALDREI verða til)");
    }
  }
  console.log("  → vökulistinn sjálfur virkjast þegar fyrsta umferðin klárast.");
} else {
  /* ---------- TÍMABILIÐ ER BYRJAÐ: allt á að hafa VAKNAÐ ---------- */
  console.log(`\n${"─".repeat(84)}`);
  console.log(`VÖKULISTINN — GW${finishedGw} er lokið og heimildirnar eiga að fylgja`);
  console.log("─".repeat(84));

  /* 0. SÉRFRÆÐINGA-HÓPURINN — "Best of the best".
     Þetta er nákvæmlega tegund kóða sem þetta safn er til fyrir: hann
     kviknar í fyrsta sinn mínútum eftir fyrsta frest og hefur ALDREI
     keyrt á lifandi svari (picks eru 404 í forleik, líka fyrir umferðir
     síðasta tímabils — mælt 9.8.2026).                                   */
  {
    const panelN = (J("pros.json").panel || []).length;
    ok(existsSync(`${D}pros_gw.json`),
      `pros_gw.json er til (hópurinn var lesinn eftir frest GW${finishedGw})`);
    if (existsSync(`${D}pros_gw.json`)) {
      const pg = J("pros_gw.json");
      const gws = Object.keys(pg.gw || {}).map(Number).filter(Number.isFinite);
      ok(gws.includes(finishedGw),
        `pros_gw ber GW${finishedGw} (hefur: ${gws.join(", ") || "engar"})`);
      const a = (pg.gw || {})[finishedGw];
      if (a) {
        ok(a.n / panelN >= 0.9,
          `þekja ${a.n}/${panelN} — hlutföllin eru marktæk`);
        /* Kaup OG sölur verða að vera til staðar. Tómt `in` þýðir að
           síunin á `event` greip ekki — sem liti út eins og "enginn
           keypti neitt" í stað "gögnin komu ekki".                      */
        /* GW1 ER UNDANTEKNING OG ThAD ER REGLA LEIKSINS, EKKI GAT I
           GOGNUNUM (25.8.2026). Fullyrdingin var "kaup OG solur verda ad
           vera til stadar", sem er rett um HVERJA UMFERD NEMA FYRSTU:
           i GW1 er upphafslidid valid og ENGIN skipti hafa gerst. Maelt
           i dag: `pros_gw.json` GW1 ber n=904 (thekjan i lagi) og
           in=0/out=0 — sem er RETTA svarid, ekki tom sokn.
           Vid fullyrdum thvi UM GW1 ad thau seu NULL, svo villan
           "sian a `event` greip ekki" komi samt fram i GW2+.          */
        const nIn = Object.keys(a.in || {}).length;
        const nOut = Object.keys(a.out || {}).length;
        /* GAMLA FULLYRDINGIN ("kaup OG solur verda ad vera til stadar") ER
           RETT UM HVERJA UMFERD NEMA FYRSTU: i GW1 er upphafslidid valid og
           engin skipti hafa gerst, svo 0/0 er RETTA svarid. Maelt a
           raungognum: `pros_gw.json` GW1 ber n=904 og in=0/out=0.

           EN "0 i GW1" MA EKKI VERDA UNDANThAGA SEM SLEKKUR A VORDINUM, og
           fyrsta tilraun min gerdi einmitt thad — hun fullyrti `=== 0` i
           GW1 og fell samstundis a TILBUNU gognunum i `clock-states.mjs`,
           sem byggja GW1 MED 40 skiptum til ad profa hina leidina. Fost
           tala um eina umferd er jafn brothaett hvora attina.

           VORDURINN SEM LIFIR ER SAMKVAEMNIN: villan sem var upphaflega
           varin gegn er "sian a `event` greip ekki", og hun slaer a ANNAN
           helminginn — annadhvort kaupin eda solurnar verda tomar. Tha er
           `(nIn === 0) !== (nOut === 0)` og fullyrdingin fellur, i HVERRI
           umferd. Ofan a thad er GW2+ krafan obreytt.                   */
        ok((nIn === 0) === (nOut === 0),
          `kaup og solur eru SAMKVAEM — bædi tom eda bædi full (kaup ${nIn}, solur ${nOut})`);
        if (finishedGw > 1) {
          ok(nIn > 0 && nOut > 0, `kaup (${nIn}) og sölur (${nOut}) skráðar`);
        } else {
          ok(true, `GW1: ${nIn} kaup / ${nOut} solur — 0 er RETTA svarid i fyrstu umferd`);
        }
        /* `value` VERDUR ad vera tala — hun er lidsverdmaetid og er til
           fra fyrstu umferd. `rankMedian` er hins vegar HEIMSROD, sem FPL
           birtir ekki fyrr en umferdin er stadfest; i GW1 ma hun thvi
           vera null. Skilyrdid er SKIPT svo talan sem ER til se profud
           og talan sem er EKKI til se ekki krafist.                    */
        ok(a.value != null, `lidsverdmaeti hopsins er tala (${a.value})`);
        if (a.rankMedian == null) {
          ok(finishedGw === 1 || !events.find(e => e.id === finishedGw)?.finished === false,
            `heimsrod vantar — leyfilegt adeins medan umferdin er ostadfest (GW${finishedGw})`);
        } else {
          ok(true, `heimsrod hopsins er tala (${a.rankMedian})`);
        }
        /* Viðmiðið verður að hafa vaknað líka — annars er hver
           samanburðartala í flipanum tóm.                              */
        ok(a.control && a.control.n > 0,
          `viðmiðshópurinn var lesinn (${a.control?.n ?? 0} svöruðu)`);
        ok(a.points != null && a.benchPoints != null,
          "stig og bekkjar-stig komu með (voru í svarinu allan tímann)");
      }
      /* MÆLINGIN SEM MÁ EKKI GLEYMAST. Elite-eignarhald er birt sem
         STAÐREYND og fer ekki í líkanið fyrr en það hefur verið mælt
         ofan á `ep_next` — nákvæmlega eins og almenni markaðurinn var
         mældur (og féll: r = −0,0005). Þegar 10 umferðir liggja fyrir
         er ekkert því til fyrirstöðu lengur, svo þetta FELLUR þangað
         til mælingin er skjalfest.                                      */
      if (gws.length >= 10) {
        /* Merkið má vera í HVORU sem er: CLAUDE.md er lifandi skjalið, en
           docs/MAELINGAR.md er sögulegt og „uppfærist ekki" skv. hausnum á
           CLAUDE.md — svo það væri rangt að krefjast þess þar.            */
        let doc = "";
        for (const f of ["../CLAUDE.md", "../docs/MAELINGAR.md"]) {
          try { doc += readFileSync(new URL(f, import.meta.url), "utf8"); } catch {}
        }
        /* MARKMIÐIÐ ER NIÐURSTAÐA, EKKI UMFJÖLLUN. Fyrsta útgáfan leitaði að
           „pros_gw" eða „Best of the best" — en LÝSING á mælingunni sem á
           eftir að gera hefði gert hana græna, og hún hefði því aldrei
           fallið þótt enginn mældi neitt. Það er nákvæmlega tóma
           fullyrðingin úr kafla 5b. Merkið hér að neðan má EKKI skrifa
           fyrr en talan liggur fyrir.                                     */
        ok(/ELITE-EO M[ÆAE]LT GEGN ep_next/i.test(doc),
          `${gws.length} umferðir komnar — elite-EO á að vera MÆLT ofan á ep_next `
          + 'og niðurstaðan skjalfest í CLAUDE.md (merki: "ELITE-EO MÆLT GEGN ep_next")');
      }
    }
  }

  /* 1. live/gw{n}.json — hráefnið sem allt per-umferðar er leitt af */
  ok(existsSync(`${D}live/gw${finishedGw}.json`),
    `live/gw${finishedGw}.json er til (hráefni allra per-umferðar talna)`);

  /* 2. Mínútuþróunin (3c): raðir eiga að vera til frá fyrstu umferð
        (gildið sjálft er 0 þar til 4-5 umferðir eru til — það er rétt). */
  const pf = J("player_form.json");
  ok(Object.keys(pf.players || {}).length > 100,
    `player_form hefur vaknað (${Object.keys(pf.players || {}).length} leikmenn)`);
  ok((pf.gws_used ?? 0) >= 1, `player_form las ${pf.gws_used} umferðir`);

  /* 3. Umferðarskýrslan fylgir SÍÐUSTU LOKNU umferð — ekki gamalli */
  const lg = J("last_gw.json");
  ok(lg.gw === finishedGw && lg.archive !== true,
    `last_gw.json er fyrir GW${finishedGw} og ekki lengur merkt archive (gw=${lg.gw})`);

  /* 4. ESPN-skotin fylgja sömu umferð (skot-kortið) */
  const sh = J("last_gw_shots.json");
  ok(sh.gw === finishedGw && (sh.shots || []).length > 50,
    `skot-kortið fylgir GW${finishedGw} (${(sh.shots || []).length} skot)`);

  /* 5. DC-hittnin (6l): raðir MEÐ afturvirkjuðu tölunni */
  const dc = J("defcon.json");
  ok((dc.players || []).length > 50,
    `defcon.players hefur vaknað (${(dc.players || []).length} leikmenn)`);
  ok((dc.players || []).every(p => "hit_rate_adj" in p && "p0" in p && "starts" in p),
    "hver DC-röð ber hit_rate_adj + p0 + starts (afturvirknin lifir)");

  /* 6. mó/aó-GLUGGINN — OG REGLAN VAR RONG HÉR TIL 20.8.2026.
        Hér stód `ok(im.archive !== true)`: safnid atti ad falla um leid og
        EIN umferd var lokin. Thad er einmitt hrunid sem `clock-states.mjs`
        kafli C1 maelir: lifandi gluggi upp a eina umferd gefur `start_feats`
        a NULL af 841 rodum (`startFeatures` krefst >= 2 gilda) og mo/ao-laug
        0 (golfid er 180 min, ein umferd nær 90). `deriveImminent` heldur thvi
        safns-glugganum ThANGAD TIL lifandi glugginn er ordinn eins langur og
        sa sem var validerud (FETCH_WINDOW = 5).

        ThAD SEM VERDUR AD HALDA I BADUM ASTONDUM ER ThEKJAN, ekki flaggid:
        flaggid segir HVADAN glugginn kemur, thekjan segir hvort hann svari
        nokkru. Fyrri utgafan fullyrti um flaggid eitt og hefdi thvi verid
        GRAEN a nakvaemlega thvi astandi sem er onýtt (archive:false, 1 umferd,
        engin rod med start_feats).                                        */
  const im = J("imminent.json");
  const IMM_LIVE_AT = 5;                      // = FETCH_WINDOW i scripts/fetch.mjs
  if (finished.length >= IMM_LIVE_AT) {
    ok(im.archive !== true,
      `imminent er EKKI lengur archive — ${finished.length} umferdir loknar, glugginn les yfirstandandi tímabil`);
  } else {
    ok(im.archive === true,
      `imminent er ENN archive og það er RÉTT — aðeins ${finished.length} af ${IMM_LIVE_AT} `
      + "umferðum loknar, og lifandi gluggi svo stuttur gefur start_feats á ENGA röð");
  }
  const featRows = (im.players || []).filter(r => r.start_feats).length;
  ok(featRows > 100,
    `og glugginn svarar: ${featRows} raðir bera start_feats (0 er hrunið sem kafli C1 mælir)`);

  /* 7. season_baseline á að FRJÓSA á fyrra tímabili — ekki uppfærast */
  const sb = J("season_baseline.json");
  ok(sb.label === "2025/26",
    `season_baseline er FROSIÐ á 2025/26 („í ár vs. í fyrra" þarf það) — er ${sb.label}`);

  /* 8. E0-leikjatölur yfirstandandi tímabils verða til við fyrsta leik.
        DEILDIN ER PRÓFUÐ, EKKI BARA AÐ RAÐIR SÉU TIL — mælt 14.8.2026:
        football-data 301-redirectar 2627/E0.csv á EC.csv (National League)
        þar til PL-skráin verður til, svo skráin bar 12 raðir með `Div:"EC"`
        og ÞETTA ATRIÐI hefði orðið grænt af rangri ástæðu. Röð sem er til
        er ekki sama og röð úr réttri deild. Vörður í `fetchFdcouk`. */
  const e0cur = existsSync(`${D}fdcouk/E0-2627.json`) ? (J("fdcouk/E0-2627.json").rows || []) : [];
  const e0divs = [...new Set(e0cur.map(r => r.Div).filter(Boolean))];
  ok(e0cur.length >= 1, "fdcouk/E0-2627.json er til með röðum (varð til við fyrsta leik)");
  ok(e0cur.length >= 1 && e0cur.every(r => r.Div === "E0"),
    `og ALLAR raðir eru úr E0 (Premier League) — deildir í skránni: ${e0divs.join("/") || "engin"}`);

  /* 9. Meiðslin (API-Sports): heimildin á ekki að vera rauð. Fjöldi para
        er EKKI prófaður — milli umferða eru engir leikdagar í ±1 dags
        glugganum og 0 pör eru þá rétt svar (sjá kafla 6 í CLAUDE.md).   */
  /* API-SPORTS ER UPPSAGDUR OG ThAD ER EKKI EITTHVAD SEM REPO-ID GETUR
     LAGAD (25.8.2026). Gamla fullyrdingin var "ekki raud", sem er RETT
     krafa i heilbrigdu astandi og ONYT i thvi astandi sem er: hun helst
     rauð thangad til notandinn opnar reikninginn a
     dashboard.api-football.com, og prof sem er varanlega rautt fyrir
     utanadkomandi astaedu eydir merkinu sem thad atti ad gefa.

     SAMA MYNSTUR OG `wiring.mjs` NOTAR UM SOMU HEIMILD: vid fullyrdum
     ekki ad hun se GRAEN, heldur ad se hun RAUD tha se thad SYNILEGT og
     RETT FLOKKAD. Tennurnar eru afram their: fullyrdingin fellur ef
     bilunin verdur thogul (engin nota) eda ef hun er merkt einhverju
     odru en adgangsleysi — og hun fellur LIKA thegar hun laeknast og
     nyja astandid er ekki grænt.                                      */
  const inj = src.apisports_injuries;
  if (inj?.ok === false) {
    const note = String(inj.note || "");
    ok(note.length > 10, `meidsla-heimildin er RAUD og bilunin er SKRAD (${note.slice(0, 60)})`);
    ok(/suspend|access|denied|plan|budget|quota/i.test(note),
      "og notan segir ad thad se ADGANGSLEYSI — ekki thogn eda tomt svar");
  } else {
    ok(inj?.ok === true, "apisports_injuries er graen (adgangur kominn aftur)");
  }
}

console.log(`\nGW1-VÖKULISTI: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
