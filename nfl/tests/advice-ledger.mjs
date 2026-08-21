/* ============================================================
   advice-ledger.mjs — RADGJAFAR-BOKHALDID.

   `scripts/snapshot-advice.mjs` skrifar nidur hvad appid RADLAGDI adur en
   vikan var spilud, svo kvordun geti seinna spurt hvort radgjofin hafi
   verid nokkurs virdi. Skran kviknar fyrst i SEPTEMBER, og reglan i
   CLAUDE.md 5 er skyr: **omældur kodi sem fer i gang einn morgun er ekki
   asættanlegt.** Thess vegna eru hlidin profud a TILBUNUM gognum thar sem
   svarid er thekkt fyrirfram, akkurat eins og `prediction-ledger.mjs`
   gerir i FPL-hlutanum.

   ThRIR ThAETTIR BERA ThYNGDINA:
     kafli 2  akkerid er ThAD SAMA og `upcomingWeek` i `fetch-nfl.mjs`
              (tvo afrit sem eru BORIN SAMAN, ekki bædi trud)
     kafli 3  hlidin: fyrir kickoff, i glugga, EINU SINNI, thunn -> ekkert
     kafli 7  APPID LES ThETTA ALDREI — byggingarleg fullyrding a `src/`
   ============================================================ */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const DATA = path.join(ROOT, "data");

let fail = 0;
const ok = (c, m) => { if (c) console.log(`  ok   ${m}`); else { console.log(`  FAIL ${m}`); fail++; } };

const { WINDOW_H, LEAGUES, weekAnchor, shouldWrite, inputsUsable, ledgerGaps,
        buildAdviceSnapshot, adviceSubstance }
  = await import("../scripts/snapshot-advice.mjs");

/* ---------- 1. GLUGGINN OG CRON-ID ---------- */
console.log("\n1. glugginn er valinn ur cron-inu, ekki ur lausu lofti");
{
  ok(WINDOW_H >= 36,
    `glugginn er ${WINDOW_H} klst — daglegur cron tharf fleiri en eitt taekifaeri`);
  /* ============================================================
     TALAN ER REIKNUD UR CRON-INU, EKKI ENDURRITUD
     ============================================================
     `nfl-data.yml` keyrir 09:00 UTC daglega og 12:00 a thridjudogum.
     Akkeri venjulegrar viku er fimmtudagur 00:00 UTC. Fullyrdingin er ad
     glugginn gefi MINNST TVO taekifaeri — eitt sleppt cron ma ekki kosta
     vikuna, og vika sem tapast er ekki endurheimtanleg.
     Cron-linurnar eru LESNAR UR WORKFLOW-INU: vaeri theim breytt an thess
     ad glugginn faerdist myndi thessi fullyrding falla, sem er retta
     hegdunin. Sama gerd og `workflow-push.mjs` i FPL-hlutanum, sem dregur
     shell-blokkina UT UR yml-inu i stad thess ad giska a hana.         */
  const yml = path.join(ROOT, "..", ".github", "workflows", "nfl-data.yml");
  ok(existsSync(yml), "`nfl-data.yml` fannst");
  if (existsSync(yml)) {
    const t = readFileSync(yml, "utf8");
    const crons = [...t.matchAll(/cron:\s*"([^"]+)"/g)].map((m) => m[1]);
    ok(crons.length >= 2, `${crons.length} cron-linur lesnar ur workflow-inu`);
    /* Klukkutimar sem keyra ALLA daga (mánuðir/dagar sem "*" eda september). */
    const hours = new Set();
    for (const c of crons) {
      const [, h, , mon, dow] = c.split(/\s+/);
      /* Adeins linur sem gilda i september OG alla vikudaga eda thridjudag. */
      if (!(mon === "*" || /(^|,)9(,|$)/.test(mon) || /8,9/.test(mon))) continue;
      if (!(dow === "*" || dow === "2")) continue;
      for (const x of h.split(",")) if (/^\d+$/.test(x)) hours.add(Number(x));
    }
    ok(hours.size >= 1, `keyrslutimar i september: ${[...hours].sort((a, b) => a - b).join(",")}`);

    /* ============================================================
       ThEKJA VAR PRENTUD EN EKKI FULLYRT — LAGAD 19.8.2026
       ============================================================
       Hér stod `ok(chances >= 2, ...)` og prentadi RAUNTOLUNA vid hlidina.
       Sú fullyrding getur ekki greint 16 fra 3 fra 2, svo hun var i verki
       logga med `ok` fyrir framan (CLAUDE.md 5b regla 1) — og notan i
       `snapshot-advice.mjs` sagdi **"ThRJU taekifaeri"** medan raunverulega
       talan i september er **16**, thvi hun taldi adeins `core`-cron-inn
       (09:00 + 21:00) og SLEPPTI `0 0,3,6,12,15,18 * 8,9 *`. Skrefid
       "Skra radgjof" i workflow-inu hefur ENGAN `if:`, svo thad keyrir
       lika i `--stage=adp`.

       TALAN ER NU REIKNUD MED RAUNVERULEGRI CRON-THYDINGU (manudur OG
       vikudagur, ekki adeins klukkutimi) og FULLYRT UPP A TOLU i BADUM
       CRON-REGIMUM. Breytist cron-id fellur thetta og sa sem breytti
       verdur ad uppfaera bokudu toluna — sem er tilgangurinn.          */
    const cronMatch = (c, d) => {
      const [min, h, dom, mon, dow] = c.split(/\s+/);
      const f = (field, val) => field === "*"
        || field.split(",").some((p) => Number(p) === val);
      return Number(min) === 0 && f(h, d.getUTCHours()) && f(dom, d.getUTCDate())
        && f(mon, d.getUTCMonth() + 1) && f(dow, d.getUTCDay());
    };
    const chancesFor = (iso) => {
      const anchor = Date.parse(iso);
      let n = 0, first = null;
      for (let t = anchor - WINDOW_H * 36e5; t < anchor; t += 36e5) {
        const d = new Date(t);
        if (crons.some((c) => cronMatch(c, d))) { n++; if (first == null) first = t; }
      }
      return { n, first, opens: anchor - WINDOW_H * 36e5 };
    };

    /* SEPTEMBER (vikur 1-4): ADP-cron-inn er i gangi -> 8 keyrslur a dag. */
    const sep = chancesFor("2026-09-17T00:00:00Z");     // vika 2, fimmtudagur
    ok(sep.n === 16,
      `september: ${WINDOW_H}-tima glugginn gefur ${sep.n} taekifaeri (bokad 16)`);

    /* OKTOBER-JANUAR: adeins 09:00 daglega + 12:00 a thridjudogum -> 3. */
    const reg = chancesFor("2026-10-15T00:00:00Z");     // vika 6, fimmtudagur
    ok(reg.n === 3,
      `oktober-januar: ${reg.n} taekifaeri (bokad 3 — thri 09, thri 12, mid 09)`);

    /* VIKA 18 er akkerud a FOSTUDEGI og faer thvi FAEST — thad er talan sem
       gamla `>= 2` var i raun ad verja, og hun a ad vera SOGD. */
    const w18 = chancesFor("2027-01-10T00:00:00Z");
    ok(w18.n === 2, `vika 18 (fostudags-akkeri): ${w18.n} taekifaeri (bokad 2 — LAEGST)`);

    /* OG ENGIN VIKA MA FA EITT: eitt sleppt cron ma ekki kosta vikuna. */
    ok(sep.n >= 2 && reg.n >= 2 && w18.n >= 2,
      "engin regima faer adeins EITT taekifaeri (24 klst gaefu eitt)");

    /* ============================================================
       OG ROD ER FRYST VID FYRSTA TAEKIFAERI — SAGT, EKKI FALID
       ============================================================
       "adeins i glugga" OG "adeins einu sinni" gefa SAMAN "skrifa vid
       FYRSTA taekifaeri og frysta". Thad er VALID hegdun hér (sja notuna i
       snapshot-advice.mjs), en tha verdur talan ad vera bokud og profud —
       annars er hun sama villan og FPL-rodin sem var skrifud 222 klst
       fyrir frest.                                                     */
    ok(sep.first === sep.opens,
      "september: fyrsta taekifaerid er a FYRSTA AUGNABLIKI gluggans " +
      "(00:00 UTC thridjudag) — rodin frystist thar");
    ok(reg.first === reg.opens + 9 * 36e5,
      "oktober: fyrsta taekifaerid er 09:00 thridjudag (9 klst inn i gluggann)");

    /* HVE LANGT ER ThAD FRA SUNNUDAGS-LEIKJUNUM? Talan sem notan bokadi
       ("~2,5 dagar") var RANGT — hun er rett fyrir viku 18 og fyrir enga
       adra. Maelt ur `schedule.json`.                                   */
    const sch = JSON.parse(readFileSync(path.join(ROOT, "data", "schedule.json"), "utf8"));
    const games = Array.isArray(sch) ? sch : (sch.games || sch.rows || []);
    const sundayOf = (wk) => {
      const t = games.filter((g) => Number(g.season) === 2026 && g.type === "REG"
          && Number(g.week) === wk && g.date)
        .map((g) => Date.parse(`${g.date}T00:00:00Z`))
        .filter((x) => Number.isFinite(x) && new Date(x).getUTCDay() === 0);
      return t.length ? Math.min(...t) + 17 * 36e5 : null;   // sunnudagur ~17:00 UTC
    };
    const lead = (wk, iso) => {
      const s = sundayOf(wk); const c = chancesFor(iso);
      return s == null ? null : (s - c.first) / 864e5;
    };
    const l2 = lead(2, "2026-09-17T00:00:00Z");
    const l6 = lead(6, "2026-10-15T00:00:00Z");
    ok(l2 != null && Math.abs(l2 - 5.71) < 0.05,
      `vika 2: rodin frystist ${l2 == null ? "?" : l2.toFixed(2)} dogum fyrir ` +
      "sunnudags-leikina (bokad 5,71 — EKKI 2,5)");
    ok(l6 != null && Math.abs(l6 - 5.33) < 0.05,
      `vika 6: ${l6 == null ? "?" : l6.toFixed(2)} dagar (bokad 5,33)`);
  }
}

/* ---------- 2. AKKERID — BORID VID `upcomingWeek` ---------- */
console.log("\n2. akkerid er ThAD SAMA og i `fetch-nfl.mjs`");
{
  /* Reglan er skrifud a TVEIMUR stodum af astaedu sem er skjolud i
     `snapshot-advice.mjs` (pipelinan keyrir `main()` a efsta svidi, svo
     hun er ekki innflytjanleg thrjum dogum fyrir draft). Afritin eru thvi
     BORIN SAMAN hér i stad thess ad vera bædi trud. */
  const src = readFileSync(path.join(ROOT, "scripts", "fetch-nfl.mjs"), "utf8");
  const uw = /function upcomingWeek\([\s\S]*?\n\}/.exec(src);
  ok(!!uw, "`upcomingWeek` fannst i `fetch-nfl.mjs`");
  const schedule = JSON.parse(readFileSync(path.join(DATA, "schedule.json"), "utf8"));
  const season = Math.max(...schedule.map((g) => Number(g.season)));
  if (uw) {
    const upcomingWeek = new Function("PROJ_WINDOW_H", `${uw[0]}; return upcomingWeek;`)(72);
    let compared = 0, differ = 0;
    for (let w = 1; w <= 18; w++) {
      const mine = weekAnchor(schedule, season, w);
      if (!Number.isFinite(mine)) continue;
      /* `upcomingWeek` skilar NAESTU ospiludu viku, svo thad er spurt
         eitt millisekund FYRIR akkerid — tha er `w` naesta vikan. */
      const theirs = upcomingWeek(schedule, season, mine - 1);
      if (!theirs || theirs.week !== w) continue;
      compared++;
      if (theirs.anchor !== mine) differ++;
    }
    ok(compared >= 15, `${compared} vikur bornar saman (annars maelir kaflinn ekkert)`);
    ok(differ === 0, `og akkerin eru EINS i ollum ${compared} vikum (${differ} skeika)`);
  }

  /* Akkerid er MIDNAETTI UTC a leikdegi — viljandi ~24 klst FYRR en
     raunverulegt upphaf (20:15 ET = 00:15 UTC naesta dag). Skekkjan ma
     adeins vera i thessa att, svo ThETTA er profad, ekki bara jafnadid. */
  const w1 = schedule.filter((g) => Number(g.season) === season && Number(g.week) === 1
    && g.type === "REG").sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];
  ok(!!w1, `fyrsti leikur ${season} viku 1 fannst (${w1 && w1.date} ${w1 && w1.time})`);
  if (w1) {
    const anchor = weekAnchor(schedule, season, 1);
    ok(anchor === Date.parse(`${w1.date}T00:00:00Z`),
      "akkerid er midnaetti UTC a degi fyrsta leiks");
    ok(anchor < Date.parse(`${w1.date}T${w1.time}:00Z`),
      "og thad er FYRIR raunverulegt upphaf — engin radgjof eftir kickoff");
  }

  /* Forleikur ber ENGA viku og tha er akkerid ekki til. */
  ok(!Number.isFinite(weekAnchor(schedule, season, 99)),
    "vika sem er ekki i skranni gefur ekkert akkeri (ekki 0, ekki NaN-gildi sem lekur)");
  /* Timabil sem er ekki i skranni heldur — sama gildra og `weekContext`. */
  ok(!Number.isFinite(weekAnchor(schedule, 1999, 1)),
    "og timabil sem er ekki i skranni gefur ekkert akkeri");
}

/* ---------- 3. HLIDIN — TILBUIN GOGN, ThEKKT SVAR ---------- */
console.log("\n3. hlidin: fyrir kickoff, i glugga, EINU SINNI");
{
  const A = Date.parse("2026-09-17T00:00:00Z");
  const H = 36e5;
  const g = (o) => shouldWrite({ season: 2026, week: 3, anchorMs: A, exists: false, ...o });

  ok(g({ nowMs: A - WINDOW_H * H - 1 }).write === false,
    "1 ms FYRIR ad glugginn opnast -> ekkert");
  ok(g({ nowMs: A - WINDOW_H * H + 1 }).write === true,
    "1 ms EFTIR ad hann opnast -> skrifad");
  ok(g({ nowMs: A - 1 }).write === true, "1 ms fyrir kickoff -> skrifad");
  ok(g({ nowMs: A }).write === false,
    "NAKVAEMLEGA a kickoff -> ekkert (radgjof eftir kickoff er ekki radgjof)");
  ok(g({ nowMs: A + 1 }).write === false, "1 ms eftir kickoff -> ekkert");
  ok(g({ nowMs: A - 1, exists: true }).write === false,
    "rod sem ER til -> ekkert, ONEMANDI (endurskrifud radgjof er retro-fitting)");
  ok(/never rewritten/.test(g({ nowMs: A - 1, exists: true }).why),
    "og astaedan er sogd berum ordum");
  ok(g({ nowMs: A - 1, week: null }).write === false,
    "forleikur (engin vika) -> ekkert");
  ok(g({ nowMs: A - 1, anchorMs: NaN }).write === false,
    "vika an leiks i skranni -> ekkert");

  /* ThUNN INNTOK. Tolurnar eru GOLF, ekki kvordun, og hvert skilyrdi er
     profad SER — annars gaeti eitt theirra verid dautt. */
  const rows = Array.from({ length: 600 }, (_, i) => ({ id: i, proj: 100 }));
  const sched = [{ season: 2026, week: 3, type: "REG", date: "2026-09-17" }];
  ok(inputsUsable({ rows, schedule: sched, season: 2026, week: 3 }) === null,
    "heil inntok -> null (ekkert ad athuga)");
  ok(/thin/.test(inputsUsable({ rows: rows.slice(0, 10), schedule: sched, season: 2026, week: 3 })),
    "of faar radir -> hafnad");
  ok(/projection/.test(inputsUsable({ rows: rows.map((r) => ({ ...r, proj: null })),
    schedule: sched, season: 2026, week: 3 })),
    "radir AN spar -> hafnad (600 radir af nullum eru umbudir, ekki farmur)");
  ok(/schedule/.test(inputsUsable({ rows, schedule: [], season: 2026, week: 3 })),
    "tom leikjaskra -> hafnad");
  ok(/out of range/.test(inputsUsable({ rows, schedule: sched, season: 2026, week: 0 })),
    "vika utan bils -> hafnad");
  ok(/no game carries/.test(inputsUsable({ rows, schedule: sched, season: 2026, week: 9 })),
    "vika sem enginn leikur ber -> hafnad");
  /* ============================================================
     OG ThETTA ER SKILYRDID SEM GAMLI KODINN FELL A: hlidid horfdi a
     `players.json` (hraa skrana), sem ber ENGAN `proj` — 0 af 1.173 —
     svo hver keyrsla var hafnad med "too few rows carry a projection".
     Skran var i lagi; hlidid horfdi a rangan hlut. Fullyrdingin er hér
     svo thad geti ekki gerst aftur.
     ============================================================ */
  const raw = JSON.parse(readFileSync(path.join(DATA, "players.json"), "utf8"));
  ok(raw.filter((p) => p.proj != null).length === 0,
    "`players.json` ber ENGAN `proj` (0) — hlidid ma ekki lesa hana");
  ok(raw.filter((p) => p.projSleeper != null).length > 500,
    `hun ber \`projSleeper\` (${raw.filter((p) => p.projSleeper != null).length}) — ` +
    "annad svid, og `proj` verdur til i `buildRows`");
}

/* ---------- 4. HOLUR — VIKA SEM TAPADIST ---------- */
console.log("\n4. holur i bokhaldinu eru ALLTAF raudar");
{
  const sched = [];
  for (let w = 1; w <= 6; w++) {
    sched.push({ season: 2026, week: w, type: "REG",
                 date: `2026-09-${String(9 + (w - 1) * 7).padStart(2, "0")}` });
  }
  const now = Date.parse("2026-10-08T09:00:00Z");     // vika 5 er byrjud
  const all = ledgerGaps({ schedule: sched, season: 2026, week: 5, nowMs: now, has: () => true });
  ok(all.length === 0, "allar vikur skradar -> engar holur");
  const none = ledgerGaps({ schedule: sched, season: 2026, week: 5, nowMs: now, has: () => false });
  ok(none.length === 4 && none[0] === 1 && none.at(-1) === 4,
    `vikur 1-4 lidnar og oskradar -> ${none.join(",")} (yfirstandandi vika er EKKI hola)`);
  const some = ledgerGaps({ schedule: sched, season: 2026, week: 5, nowMs: now,
                            has: (w) => w !== 3 });
  ok(some.length === 1 && some[0] === 3, `ein vika vantar -> ${some.join(",")}`);
  /* Vika sem er FRAMUNDAN er ekki hola — hun er einfaldlega ekki komin. */
  const early = ledgerGaps({ schedule: sched, season: 2026, week: 5,
                             nowMs: Date.parse("2026-09-10T09:00:00Z"), has: () => false });
  ok(early.length === 1 && early[0] === 1,
    `10.9. er adeins vika 1 lidin -> ${early.join(",")} (framtidin er ekki hola)`);
}

/* ---------- 5. RODIN SJALF — TILBUNAR DEILDIR ---------- */
console.log("\n5. rodin: badar deildir, radgjof OG inntokin");
{
  const schedule = [
    { season: 2026, week: 3, type: "REG", date: "2026-09-24", time: "20:15",
      home: "SF", away: "SEA", total: 48, spread: 4 },
    /* LEIKUR AN LINU — 'engin lina' er NORMAL astand i thessari skra. */
    { season: 2026, week: 3, type: "REG", date: "2026-09-27", time: "13:00",
      home: "KC", away: "LV", total: null, spread: null },
    /* ANNAD TIMABIL, SAMA VIKA. Ma ekki smitast inn. */
    { season: 2025, week: 3, type: "REG", date: "2025-09-21", time: "13:00",
      home: "SF", away: "DAL", total: 60, spread: -20 },
  ];
  const defense = [
    { season: 2026, team: "SEA", pos: "RB", games: 2, raw: 26, adj: 25, leagueMean: 20 },
    { season: 2026, team: "SF", pos: "RB", games: 2, raw: 14, adj: 15, leagueMean: 20 },
    { season: 2019, team: "SEA", pos: "RB", games: 16, raw: 5, adj: 5, leagueMean: 20 },
  ];
  const rows = [
    { id: "1", name: "RB one", pos: "RB", team: "SF", proj: 238, bye: 9, vbd: 90 },
    { id: "2", name: "RB two", pos: "RB", team: "SEA", proj: 170, bye: 6, vbd: 40 },
    { id: "3", name: "WR one", pos: "WR", team: "KC", proj: 200, bye: 10, vbd: 60 },
    { id: "4", name: "Free RB", pos: "RB", team: "LV", proj: 210, bye: 8, vbd: 80 },
    { id: "SF", name: "SF D/ST", pos: "DST", team: "SF", proj: 120, vbd: 10 },
    { id: "SEA", name: "SEA D/ST", pos: "DST", team: "SEA", proj: 110, vbd: 5 },
    { id: "5", name: "Their WR", pos: "WR", team: "SF", proj: 150, bye: 9, vbd: 30 },
  ];
  const leagues = [{
    id: "L1", name: "With DEF",
    rules: { teams: 2, scoring: "ppr", starters: { RB: 1, WR: 1, DST: 1 }, flexPos: [] },
    userId: "u1",
    users: [{ user_id: "u1", display_name: "me" }, { user_id: "u2", display_name: "them" }],
    rosters: [
      /* WR one (KC) ER I MINUM HOP OG ThAD ER ASETT: leikur KC-LV ber ENGA
         LINU, svo hann er tilfellid "motherji thekktur, tala ekki til" —
         thridja tegundin af engu, og hun verdur ad skila `null`. */
      { roster_id: 1, owner_id: "u1", players: ["1", "2", "3", "SF"],
        starters: ["2", "3", "SF"] },
      { roster_id: 2, owner_id: "u2", players: ["5"], starters: ["5"] },
    ],
  }, {
    id: "L2", name: "No DEF", error: "HTTP 500 on /rosters",
  }];

  const now = Date.parse("2026-09-23T09:00:00Z");
  const snap = buildAdviceSnapshot({ season: 2026, week: 3, rows, schedule, defense,
    meta: { season: 2026, week: 3, seasonType: "regular" }, leagues,
    anchorMs: Date.parse("2026-09-24T00:00:00Z"), nowTs: now });

  ok(snap.season === 2026 && snap.week === 3, "arid og vikan eru i rodinni");
  ok(snap.hoursToAnchor === 15, `\`hoursToAnchor\` er 15 (${snap.hoursToAnchor}) — ` +
    "kvordunin verdur ad geta flokkad eftir thvi hve fersk radgjofin var");
  ok(snap.nfl.games === 2,
    `ADEINS 2026-leikirnir eru taldir (${snap.nfl.games}) — 2025 smitast ekki inn`);
  ok(snap.nfl.lines === 2,
    `og adeins leikurinn MED linu ber tolu (${snap.nfl.lines} af 4 lidum)`);
  ok(snap.nfl.defSeason === 2026 && snap.nfl.defRows === 2,
    `vornin er ur 2026 (${snap.nfl.defSeason}, ${snap.nfl.defRows} radir), ekki 2019`);

  const l1 = snap.leagues.find((l) => l.id === "L1");
  const l2 = snap.leagues.find((l) => l.id === "L2");
  ok(!!l1 && !!l2, "badar deildir eru i rodinni");
  ok(l2.error === "HTTP 500 on /rosters" && !l2.startsit,
    "deild sem BRAST er SKRAD med villunni, ekki sleppt (thogn vaeri lesin sem 'engin rad')");
  ok(l1.rosterId === 1, `mitt lid var leyst (${l1.rosterId})`);
  ok(l1.shape.scoring === "ppr" && l1.shape.starters.DST === 1,
    "deildar-formid er skrad — radgjof an reglna er osamanburdarhaef");
  ok(l1.claimed && l1.claimed.pct != null && l1.claimed.significant === true,
    `MAELDA FULLYRDINGIN sem var a skjanum er skrad (${l1.claimed.pct}%, ` +
    "t=" + l1.claimed.t + ") — hun rekur, svo hun verdur ad fylgja rodinni");

  /* -- start/sit: hver leikmadur ber INNTOKIN, ekki adeins utkomuna -- */
  ok(l1.startsit && l1.startsit.starters.length === 3,
    `thrju byrjunarsaeti (${l1.startsit && l1.startsit.starters.length})`);
  const rb = [...l1.startsit.starters.map((s) => s.player), ...l1.startsit.bench]
    .find((p) => p && p.id === "1");
  ok(!!rb, "RB one er i rodinni");
  ok(rb.inputs.implied === 26, `markadslina hans lids er skrad (${rb.inputs.implied})`);
  ok(rb.inputs.opp === "SEA", `motherjinn er skradur (${rb.inputs.opp})`);
  ok(rb.inputs.defAdj === 25, `vorn motherjans gegn stodunni er skrad (${rb.inputs.defAdj})`);
  ok(rb.projSleeper != null && rb.proj !== rb.projSleeper,
    `BADAR tolur eru skradar: okkar ${rb.proj} og Sleeper ${rb.projSleeper} — ` +
    "vidmid vantar annars og '3,5% af bilinu' er tala an samanburdar");
  /* MAGNITUDE: rodin ma ekki bera 17x tolu. Sama gerd og
     `dashboard.mjs` kafli 3b — akkeri, ekki kvordun. */
  ok(rb.proj > 4 && rb.proj < 30,
    `og talan er a viku-kvarda (${rb.proj}) — 17x villa gaefi ${(rb.proj * 17).toFixed(0)}`);
  /* WR i leik AN LINU: `implied` er NULL, ekki 0. */
  const wr = [...l1.startsit.starters.map((s) => s.player), ...l1.startsit.bench]
    .find((p) => p && p.id === "3");
  ok(wr && wr.inputs.implied === null,
    "leikmadur i leik an linu ber `implied: null`, EKKI 0");
  /* OG ThA ER OKKAR TALA THEIRRA — UPP A NAMUNDUN, ekki upp a bit.
     `weeklyProjection` namundar `pts` a einn aukastaf medan `projSleeper`
     er hra deilingin (11,8 gegn 11,7647). Fyrsta utgafa thessarar
     fullyrdingar krafdist `===` og FELL A RETTUM KODA — hun var min
     tilgata um utfaersluna, ekki krafa. Rett fullyrding er ad ENGINN
     LIDUR hafi verid lagdur vid, og namundun er ekki lidur:
     margfaldari 1,0 er thad sem er verid ad profa.                    */
  ok(wr && Math.abs(wr.proj - wr.projSleeper) < 0.06,
    `og tha er okkar tala theirra upp a namundun (${wr && wr.proj} gegn ` +
    `${wr && wr.projSleeper && wr.projSleeper.toFixed(2)}) — enginn margfaldari lagdur vid`);
  ok(wr && wr.inputs.defAdj === null,
    "og hann ber engan varnarlid heldur (motherjinn er ekki i `defense`)");
  ok(Array.isArray(l1.startsit.currentStarters) && l1.startsit.currentStarters.length === 3,
    "ThAD SEM NOTANDINN VAR MED er skrad — an thess er `benchRegret` osvaranlegt seinna");
  ok(l1.startsit.advice && l1.startsit.advice.isOptimal === false,
    "og radgjofin sjalf: uppstillingin var EKKI optimal");
  ok(l1.startsit.advice.changes.some((c) => c.inId === "1" && c.outId === "2"),
    "skiptin eru skrad med audkennum (RB one inn fyrir RB two)");
  ok(l1.startsit.advice.changes.every((c) => c.gain == null || c.gain > 0),
    "og abatinn er skradur per skipti");

  /* -- waiver: gjaldmidillinn er NEFNDUR i rodinni -- */
  ok(l1.waivers && /season vbd/.test(l1.waivers.currency),
    `gjaldmidillinn er skrifadur i rodina ("${l1.waivers && l1.waivers.currency}") — ` +
    "svo enginn beri hana seinna vid vikuleg stig");
  ok(l1.waivers.picks.some((p) => p.addId === "4"),
    "og lausi RB-inn er radlagdur (Free RB)");

  /* -- DST: ADEINS i deild sem byrjar vorn, og allar radirnar -- */
  ok(l1.dst && l1.dst.rows.length === 2, `DST-listinn ber allar radirnar (${l1.dst.rows.length}) — ` +
    "topp 3 eitt gerir 'hve gott var thad sem vid volddum' osvaranlegt");
  const sfD = l1.dst.rows.find((r) => r.team === "SF");
  ok(sfD && sfD.oppImplied === 22, `SF-vornin ber vaent skor motherjans (${sfD && sfD.oppImplied})`);

  /* Deild AN varnarsaetis faer `dst: null` OG astaeduna. */
  const noDef = buildAdviceSnapshot({ season: 2026, week: 3, rows, schedule, defense,
    meta: {}, leagues: [{ ...leagues[0], id: "L3", error: null,
      rules: { teams: 2, scoring: "half-ppr", starters: { RB: 1, WR: 1 }, flexPos: [] } }],
    anchorMs: Date.parse("2026-09-24T00:00:00Z"), nowTs: now });
  ok(noDef.leagues[0].dst === null && /does not start a defence/.test(noDef.leagues[0].dstWhy),
    "deild an varnarsaetis faer `dst: null` og astaeduna — ekki tomt fylki");

  /* -- ThEKJA ER TALA, EKKI BOOLEAN -- */
  ok(snap.coverage.players > 0 && snap.coverage.implied < snap.coverage.players,
    `thekjan er TOLUR: ${snap.coverage.implied} af ${snap.coverage.players} bera linu ` +
    "— `!!ctx` hefdi sagt 'ja' medan hver einasta lina var null");
  ok(snap.coverage.leaguesWithError === 1 && snap.coverage.leaguesWithStartsit === 1,
    "og bilanir eru TALDAR, ekki adeins skradar");

  /* -- MITT LID OTHEKKT -> SAGT, EKKI GISKAD -- */
  const anon = buildAdviceSnapshot({ season: 2026, week: 3, rows, schedule, defense,
    meta: {}, leagues: [{ ...leagues[0], userId: null }],
    anchorMs: Date.parse("2026-09-24T00:00:00Z"), nowTs: now });
  ok(anon.leagues[0].startsit === null && /roster id could not be resolved/
       .test(anon.leagues[0].startsitWhy),
    "othekkt lid -> `startsit: null` OG astaedan (radgjof um rangt lid er verri en engin)");

  /* ============================================================
     OG SAMA REGLA A WAIVER-HLIDINNI — HUN VAR BROTIN
     ============================================================
     `row.waiversWhy` las `fa.why`. `freeAgents` ber ENGAN `why`; hun
     skrifar astaeduna i `notes` (`unknownPool` skilar `notes: [why]`).
     Lesturinn var thvi `undefined` i hverju tilfelli og fell i almenna
     strenginn — ThRJAR astaedur urdu EIN, i skra sem er TIL ThESS ad
     segja hvers vegna.

     Fundid mekaniskt af `wiring.mjs` kafla 9, ekki med lestri; sami
     klasi og `advice.swaps` i `Dashboard.jsx`.

     ThEKJA FYRST (regla 2 i CLAUDE.md 5b): hin serstaka astaeda verdur
     ad vera SANNANLEGA til i `notes`, annars gaeti fullyrdingin "hun er
     ekki almenna strengurinn" verid sonn af thvi ad ekkert er thar.  */
  {
    const { freeAgents } = await import("../src/waivers.js");
    const raw = freeAgents({ rows, rosters: [], myRosterId: null });
    ok(raw.pool === null && Array.isArray(raw.notes) && raw.notes.length === 1,
      `ThEKJA: \`freeAgents\` ber astaeduna i \`notes\` (${raw.notes.length} rod)`);
    ok(raw.why === undefined,
      "og BER ENGAN `why` — svidid sem bokhaldid las er til hvergi");

    const noPool = buildAdviceSnapshot({ season: 2026, week: 3, rows, schedule, defense,
      meta: {}, leagues: [{ ...leagues[0], rosters: [], users: [] }],
      anchorMs: Date.parse("2026-09-24T00:00:00Z"), nowTs: now });
    const w = noPool.leagues[0];
    ok(w.waivers === null, "laug sem var ekki lesin gefur `waivers: null`");
    ok(w.waiversWhy === raw.notes.join(" "),
      `og rodin ber SERSTOKU astaeduna ("${(w.waiversWhy || "").slice(0, 48)}…")`);
    ok(w.waiversWhy !== "the pool could not be read",
      "ekki almenna strenginn — hann var eina svarid medan svidid het `why`");
  }
}

/* ---------- 6. `--dry` SKRIFAR EKKERT ---------- */
console.log("\n6. `--dry` skrifar EKKERT — borid a BAETUM");
{
  /* ============================================================
     ThETTA ER SU VILLA SEM FPL-BOKHALDID HAFDI: `--dry` las flaggid en
     SPURDI ThAD EKKI fyrr en EFTIR hlidin, og skip-leidin kalladi
     `recordLedger`, sem er LES-BREYTA-SKRIFA a `status.json`. `--dry`
     gerdi thvi nakvaemlega hvorugt thess sem thad er til fyrir: thad
     skrifadi, og thad prentadi enga thekju.
     Fullyrdingin er a BAETUM skrarinnar fyrir og eftir — ekki a thvi ad
     kodinn "lítur retta ut".
     ============================================================ */
  const status = path.join(DATA, "status.json");
  const before = readFileSync(status);
  const adviceDir = path.join(DATA, "advice");
  const dirBefore = existsSync(adviceDir) ? readdirSync(adviceDir).sort().join(",") : null;

  const r = spawnSync("node", [path.join(ROOT, "scripts", "snapshot-advice.mjs"), "--dry"],
    { encoding: "utf8", timeout: 180000 });
  const after = readFileSync(status);
  ok(Buffer.compare(before, after) === 0,
    "`--dry` skrifadi EKKI i `status.json` (baetin eru eins)");
  const dirAfter = existsSync(adviceDir) ? readdirSync(adviceDir).sort().join(",") : null;
  ok(dirBefore === dirAfter, "og hun skrifadi engа skra i `data/advice/`");
  ok(/DRY RUN/.test(r.stdout || ""), "hun segir ad hun se thurr");
  ok(/NOTHING WRITTEN|would skip|NOT written/.test(r.stdout || ""),
    "og hun segir hvad hun HEFDI gert");

  /* `--week` ER AEFINGAFLAGG OG MA ALDREI VIRKA I RAUNKEYRSLU. Vaeri thad
     virkt gaeti thad skrifad rod fyrir viku sem appid syair ekki. */
  const real = spawnSync("node",
    [path.join(ROOT, "scripts", "snapshot-advice.mjs"), "--week=3"],
    { encoding: "utf8", timeout: 180000 });
  ok(real.status === 1 && /refused/.test(real.stdout || ""),
    "`--week` an `--dry` er HAFNAD (aefingaflagg ma ekki skrifa rod)");
  ok(Buffer.compare(before, readFileSync(status)) === 0,
    "og hofnunin skrifadi ekkert heldur");
}

/* ---------- 7. APPID LES ThETTA ALDREI ---------- */
console.log("\n7. appid les bokhaldid ALDREI");
{
  /* Bokhaldid er maelitaeki. Laesi appid thad vaeri thad ordid
     birtingargagn og tha maeldi thad sjalft sig — sama regla og
     `data/predictions/` i FPL-hlutanum ("Appid les thetta ALDREI"). */
  const files = readdirSync(path.join(ROOT, "src")).filter((f) => /\.(js|jsx)$/.test(f));
  ok(files.length > 10, `${files.length} skrar i src/ skannadar (thekja er fullyrding)`);
  const guilty = files.filter((f) => {
    const t = readFileSync(path.join(ROOT, "src", f), "utf8");
    return /["'`]advice\//.test(t) || /snapshot-advice/.test(t) || /advice_ledger/.test(t);
  });
  ok(guilty.length === 0,
    `engin skra i src/ nefnir bokhaldid (${guilty.join(", ") || "engin"})`);

  /* Og skriftan VERDUR ad flytja hreinu einingarnar inn i stad thess ad
     endurreikna thaer. BYGGINGARLEG fullyrding — sama gerd og
     `prediction-ledger.mjs` gerir vid `buildTeamMetrics` (CLAUDE.md 7.1).
     Afrit af utreikningi laug thar, og thad myndi ljuga hér. */
  const led = readFileSync(path.join(ROOT, "scripts", "snapshot-advice.mjs"), "utf8");
  for (const [mod, fn] of [["weekview.js", "weekRows"], ["weekview.js", "weekContext"],
                           ["lineup.js", "optimalLineup"], ["lineup.js", "lineupAdvice"],
                           ["waivers.js", "pickupAdvice"], ["weekview.js", "dstStream"],
                           ["build.js", "buildRows"], ["standings.js", "myRosterId"]]) {
    ok(new RegExp(`${fn}[^\\n]*\\n?[^\\n]*from "\\.\\./src/${mod.replace(".", "\\.")}"`)
         .test(led) || new RegExp(`import \\{[^}]*\\b${fn}\\b`).test(led),
      `bokhaldid FLYTUR INN \`${fn}\` (endurreiknar hana ekki)`);
  }
  /* Og thad ma ekki bera sina eigin formulu fyrir viku-vorpunina. */
  ok(!/\/\s*17\b/.test(led) && !/GAMES_IN_SEASON\s*=/.test(led),
    "og hun ber EKKI sitt eigid `/ 17` — su tala var thegar skrifud tvisvar einu sinni");
}

/* ---------- 8. SKREFID ER I WORKFLOW-INU, MED continue-on-error ---------- */
console.log("\n8. skrefid er tengt — og ma ekki fella gagna-keyrsluna");
{
  /* PROFID SEM LES KODA SER EKKI WORKFLOW-ID. `lineups.mjs` i
     FPL-hlutanum var graent allan timann medan `fetch-fast.yml` hafdi
     ENGAN `env`-blokk, svo fallid var sleppt thegjandi. Thess vegna er
     yml-id lesid hér.

     ============================================================
     OG FYRSTA UTGAFA ThESSA KAFLA VAR TOM FULLYRDING — TVISVAR
     ============================================================
     Hun leitadi ad `/snapshot-advice\.mjs/` i ALLRI skranni og ad
     `/continue-on-error:\s*true[\s\S]{0,500}?snapshot-advice\.mjs/`.
     Bædar stodust stokkbreytingu:
       · heitid `snapshot-advice.mjs` er NEFNT I ATHUGASEMDINNI, svo
         `run:`-linan matti hverfa og leitin fann thad samt
       · og `continue-on-error: true` a SKREFINU A UNDAN (measure-experts)
         var innan 500 stafa, svo minn eigin flagg matti hverfa
     Stokkbreytingarnar "skrefid fjarlaegt" og "continue-on-error tekid ut"
     SLUPPU BAÐAR I GEGN. Nu er yml-id KLOFID I SKREF og fullyrdingin er a
     ThVI SKREFI sem raunverulega keyrir skriftuna — CLAUDE.md 5b regla 2:
     neikvaed/nalaegdar-fullyrding er einskis virdi nema hun se bundin thvi
     sem var sannanlega tharna.                                         */
  const yml = path.join(ROOT, "..", ".github", "workflows", "nfl-data.yml");
  ok(existsSync(yml), "`nfl-data.yml` fannst");
  const t = existsSync(yml) ? readFileSync(yml, "utf8") : "";
  /* Klofid a skref-mork (`      - name:` eda `      - uses:`). */
  const steps = t.split(/\n(?=      - (?:name|uses):)/).slice(1);
  ok(steps.length >= 4, `${steps.length} skref lesin ur yml-inu (annars er klofningin brotin)`);
  /* Skrefid er ThAD SEM KEYRIR SKRIFTUNA — `run:`, ekki athugasemd. */
  /* ATHUGASEMDIR ERU STRIPADAR ADUR EN ThAD ER LEITAD. Stokkbreyting
     "env-blokkin tekin ut" SLAPP I GEGN thvi `NFL_LEDGER_USER` er NEFNT I
     ATHUGASEMDINNI i sama skrefi — thridja tilfellid af somu gerd i thessum
     eina kafla. Nu er leitad i YAML-inu, ekki i prosanum um thad. */
  const bare = (st) => st.split("\n").filter((l) => !/^\s*#/.test(l)).join("\n");
  const mine = steps.map(bare).filter((st) => /^\s*run:.*snapshot-advice\.mjs/m.test(st));
  ok(mine.length === 1,
    `nakvaemlega EITT skref keyrir \`snapshot-advice.mjs\` (${mine.length})`);
  if (mine.length === 1) {
    ok(/^\s*continue-on-error:\s*true\s*$/m.test(mine[0]),
      "og ThAD SKREF ber `continue-on-error: true` — bokhaldid ma ekki fella "
      + "gagna-keyrsluna");
    /* `NFL_LEDGER_USER` er thad eina sem tharf til ad start/sit se skrad
       (Sleeper gefur enga leid ad vita hver af eigendunum er notandinn).
       Vanti hann ber rodin waiver og DST en `startsit: null` MED astaedu —
       en ThA MA WORKFLOW-ID EKKI ThEGJA UM ThAD, thvi thad er stilling sem
       enginn myndi taka eftir ad vanti. */
    ok(/NFL_LEDGER_USER/.test(mine[0]),
      "og hun faer `NFL_LEDGER_USER` (an hans er `startsit` alltaf null)");
  }
  /* Committad: skrain verdur ad komast inn i repo-id, annars er hun
     skrifud i CI og hverfur med keyrslunni. */
  ok(/git add nfl\/data/.test(t),
    "`git add nfl/data` naer yfir `nfl/data/advice/` (annars hyrfi rodin med keyrslunni)");
}

/* ---------- 9. DEILDIRNAR ERU STILLTAR ---------- */
console.log("\n9. deildirnar sem eru maeldar");
{
  ok(Array.isArray(LEAGUES) && LEAGUES.length >= 1,
    `${LEAGUES.length} deildir stilltar`);
  ok(LEAGUES.every((l) => /^\d{15,20}$/.test(String(l.id))),
    "og audkennin eru a Sleeper-formi (19-stafa snjokorn)");
  /* Audkennin eru ThEGAR i `src/standings.js` — thetta er engin ny
     birting og sannreynt hér svo enginn thurfi ad giska a thad. */
  const st = readFileSync(path.join(ROOT, "src", "standings.js"), "utf8");
  const inSrc = LEAGUES.filter((l) => st.includes(String(l.id)));
  ok(inSrc.length === LEAGUES.length,
    `og allar ${inSrc.length} eru thegar skjaladar i src/standings.js (engin ny birting)`);
}

/* ============================================================
   10. ThUNNA HLIDID HLEYPTI TOMRI ROD I GEGN — OG MERKTI HANA `ok`
   ============================================================
   Regla 3 i hausnum a `snapshot-advice.mjs` er "thunn inntok -> engin
   skra". Hlidid var:

       if (!coverage.leaguesWithStartsit && !coverage.leaguesWithWaivers)

   og `leaguesWithWaivers` telur `row.waivers` eftir SANNGILDI HLUTS.
   Med `NFL_LEDGER_USER` OSETTAN er `mineId` null i hverri deild:
   `startsit` verdur null (rett), en `freeAgents` skilar SAMT hlut med
   raunverulegri laug — laugin er ekki hadd thvi hver eg er — og
   `pickupAdvice({ mine: null })` skilar TOMU fylki. Utkoman er
   `row.waivers = { poolSize: N, mineSize: null, picks: [] }`, sem er
   truthy, svo hlidid OPNADIST. Skrain hefdi verid skrifud med
   `startsit: null` i hverri deild og NULL skiptum, og bokud `ok: true`.

   OG REGLA 2 GERIR ThAD OLAGFAERANLEGT: rod sem er til er ALDREI
   endurskrifud, svo sa haus hefdi stadid i bokhaldinu vikuna sem
   inntokin voru enn til. `data/advice/` er ekki til enn — thess vegna er
   thetta lagad ADUR en vika 1 er skrifud, ekki eftir.

   ThRJAR FULLYRDINGAR OG ThEKJAN ER FYRST: gamla hlidid VERDUR ad hafa
   opnast a thessari myndinni (`leaguesWithWaivers > 0` medan `players`
   og `picks` eru 0), annars maelir kaflinn ekkert.
   ============================================================ */
console.log("\n10. thunna hlidid: innihald, ekki sanngildi hluts");
{
  const rows = [
    { id: "1", name: "RB one", pos: "RB", team: "SF", proj: 238, bye: 9, vbd: 90 },
    { id: "2", name: "RB two", pos: "RB", team: "SEA", proj: 170, bye: 6, vbd: 40 },
    { id: "4", name: "Free RB", pos: "RB", team: "LV", proj: 210, bye: 8, vbd: 80 },
  ];
  const league = {
    id: "L1", name: "No identity",
    rules: { teams: 2, scoring: "ppr", starters: { RB: 1 }, flexPos: [] },
    /* ============================================================
       ENGIN SAETIS-UPPLYSING — ThAD ER ASETT
       ============================================================
       `userId: null` er nakvaemlega thad sem gerist thegar
       `NFL_LEDGER_USER` er ekki settur i workflow-inu. Rostrarnir eru
       LESANLEGIR (svo laugin verdur til) en ekkert segir hver eg er.  */
    userId: null,
    users: [{ user_id: "u1", display_name: "me" }],
    rosters: [{ roster_id: 1, owner_id: "u1", players: ["1", "2"], starters: ["2"] }],
  };
  const snap = buildAdviceSnapshot({
    season: 2026, week: 3, rows, schedule: [], defense: [], meta: {},
    leagues: [league], anchorMs: Date.parse("2026-09-24T00:00:00Z"),
    nowTs: Date.parse("2026-09-23T09:00:00Z"),
  });

  /* -- ThEKJA: gamla hlidid VERDUR ad hafa opnast hér -- */
  ok(snap.coverage.leaguesWithStartsit === 0,
    `\`leaguesWithStartsit\` er 0 (${snap.coverage.leaguesWithStartsit})`);
  ok(snap.coverage.leaguesWithWaivers > 0,
    `en \`leaguesWithWaivers\` er ${snap.coverage.leaguesWithWaivers} — ` +
    "GAMLA HLIDID OPNADIST, svo thetta er raunveruleg svidsmynd");
  ok(snap.coverage.players === 0 && snap.coverage.picks === 0,
    `og samt er INNIHALDID null: ${snap.coverage.players} leikmenn, ` +
    `${snap.coverage.picks} skipti`);

  /* -- OG NYJA HLIDID LOKAR -- */
  const sub = adviceSubstance(snap);
  ok(sub.substantive === false,
    "nyja hlidid LOKAR — spurt er um innihald, ekki um sanngildi hluts");
  ok(sub.noIdentity === true, "og astaedan er greind: saetid var ekki leyst");
  ok(/refused: no identity/.test(sub.why || ""),
    `status-rodin segir "refused: no identity" (${(sub.why || "").slice(0, 44)}…)`);

  /* -- MAELITAEKID VERDUR AD GETA HLEYPT RAUNVERULEGRI ROD I GEGN --
     An thessa vaeri hlidid einfaldlega LOKAD og bokhaldid tomt ad
     eilifu, sem er onnur mynd af somu villu. */
  const good = buildAdviceSnapshot({
    season: 2026, week: 3, rows, schedule: [], defense: [], meta: {},
    leagues: [{ ...league, userId: "u1" }],
    anchorMs: Date.parse("2026-09-24T00:00:00Z"),
    nowTs: Date.parse("2026-09-23T09:00:00Z"),
  });
  ok(good.coverage.players > 0,
    `med saeti eru ${good.coverage.players} leikmenn skrifadir`);
  const okSub = adviceSubstance(good);
  ok(okSub.substantive === true && okSub.why === null,
    "og tha OPNAR hlidid (maelitaekid virkar i BADAR attir)");

  /* -- "ENGINN RADLAGDI NEITT" OG "VITUM EKKI HVER EG ER" ERU SITTHVAD.
        Hid sidara er UPPSETNING sem notandinn getur lagad; ad kalla
        thad sama nafni vaeri ad fela eina astaedu sem hann getur
        raunverulega gert eitthvad vid. -- */
  const broke = adviceSubstance({
    coverage: { players: 0, picks: 0 },
    leagues: [{ id: "X", error: "HTTP 500 on /rosters" }],
  });
  ok(broke.substantive === false && broke.noIdentity === false,
    "deild sem BRAST er EKKI merkt `no identity`");
  ok(/HTTP 500/.test(broke.why) && !/refused: no identity/.test(broke.why),
    `hun ber SINA astaedu (${broke.why.slice(0, 40)}…)`);

  /* -- OG HLIDID VERDUR AD VERA ThAD SEM KEYRSLAN NOTAR.
        Hreint fall sem enginn kallar er nakvaemlega gatid sem
        `wiring.mjs` er skrifad um. -- */
  const src = readFileSync(path.join(ROOT, "scripts", "snapshot-advice.mjs"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ");
  ok(/adviceSubstance\(snap\)/.test(src),
    "`adviceSubstance(snap)` er KALLAD i keyrslunni");
  ok(!/leaguesWithWaivers\s*\)/.test(src) &&
     !/!snap\.coverage\.leaguesWithWaivers/.test(src),
    "og gamla sanngildis-hlidid er farid ur keyrslunni");
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll bokhalds-profin graen");
process.exit(fail ? 1 : 0);
