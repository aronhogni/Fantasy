/* ============================================================
   LIDA-TOLUR — FLIPINN

   BIRTING EINGONGU. Hver tala kemur ur `src/teamstats.js` (hreint,
   ekkert React) af somu astaedu og `model.js` og `stats.js`: profin
   keyra sama kodann og skjarinn synir.

   AF HVERJU SER FLIPI OG EKKI DALKAR I LEIKMANNALISTANUM: rodin er
   LIDID, ekki leikmadurinn. Ad haengja 20 lida-tolur a 572 leikmenn
   vaeri ad endurtaka somu tuttugu raedirnar 28 sinnum hverja, og
   rodun eftir theim vaeri rodun a lidum i dulargervi.
   ============================================================ */
import React, { useMemo, useState, useEffect } from "react";
import ShotMap from "./ShotMap.jsx";
import { buildTeamRows, TEAM_STAT_DEFS, TEAM_GROUPS, sortTeamRows, TEAM_STAT_BY_KEY } from "./teamstats.js";

/* Engin sameiginleg thema-eining er til i thessu repo-i — hver eining ber
   sina eigin `C` (sbr. PlayerList.jsx og Leagues.jsx). Afritad viljandi
   fremur en ad bua til nyja sameign i midri lotu thar sem onnur lota er
   ad breyta somu skram.                                                 */
const C = {
  card:"#ffffff", cardAlt:"#fafafb", border:"#e0e0e4", text:"#1d1d20",
  text2:"#61616b", text3:"#8b8b95", purple:"#37003c", green:"#00b96b",
  amber:"#c98a00", amberBg:"#fff6e0", red:"#d92d3c", greenBg:"#e6f9f0",
};
const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";

export default function Teams({ teams, teamForm, luck, teamShots, fixtures, bsdTeams, shotIndex, Crest }) {
  /* UMFERDAR-BIL — EN AÐEINS FYRIR ThAD SEM ThAD GETUR HREYFT.
     ENGIN lids-skra i repo-inu ber tolur per umferd: team_form, luck,
     team_shots og bsd_teams eru ALLAR timabils-summur. Thad eina sem er
     til per umferd eru SKOTIN (bsd_shots.json ber nu `gw` a hverju skoti),
     svo bilid hreyfir skot-dalkana og ekkert annad. Hinir eru merktir
     `season` — sama regla og i Player stats: thogull dalkur sem hreyfist
     ekki er verri en dalkur sem segir ad hann geri thad ekki.          */
  const [gwRange, setGwRange] = useState(null);       // [fra, til] eda null
  const [group, setGroup] = useState("keeper");
  /* Valid lid fyrir skotakortin. null = ekkert valid.               */
  const [pick, setPick] = useState(null);
  const [sort, setSort] = useState({ key: "sot_against_pg", dir: "asc" });

  const base = useMemo(
    () => buildTeamRows({ teams, teamForm, luck, teamShots, bsdTeams }),
    [teams, teamForm, luck, teamShots, bsdTeams]);

  /* Skot-dalkarnir endurreiknadir ur SIUDUM skotum. Somu formulur og
     scripts/fetch-bsd-teams.mjs notar (per leik, xg/skot, big chance =
     xg >= 0,18) — annars gaefu taflan og skran sitt hvad.              */
  /* URSLIT UR fixtures.json — HIN per-umferdar heimildin, og hun var ekki
     einu sinni send inn i thennan flipa (lagad 11.8.2026).
     Athugasemdin her ad ofan sagdi "thad eina sem er til per umferd eru
     SKOTIN". Thad var rangt: `fixtures.json` ber `event` og bæði mörkin a
     hverjum leik, svo MORK, MORK A SIG, HREIN BLOD og leikjafjoldi eru
     ollum stundum reiknanleg per umferdar-bili. Thar med fylgja lika
     BADIR mismuna-dalkarnir (G-xG og GC-xGC) sem adur voru THVINGADIR I
     NULL um leid og bil var valid — their thurfa hvorttveggja og hofdu
     annan helminginn allan timann.                                      */
  const fixAgg = useMemo(() => {
    if (!gwRange || !Array.isArray(fixtures)) return null;
    const [lo, hi] = gwRange;
    const acc = new Map();          // team id -> { gf, ga, cs, n }
    const bump = (id, gf, ga) => {
      const a = acc.get(id) || { gf: 0, ga: 0, cs: 0, n: 0 };
      a.gf += gf; a.ga += ga; a.cs += ga === 0 ? 1 : 0; a.n++;
      acc.set(id, a);
    };
    for (const f of fixtures) {
      /* ADEINS LOKNIR LEIKIR. Onnur skilyrdi (started/minutes) duga ekki:
         leikur i gangi hefur hlutastodu, og hun myndi telja sem urslit.  */
      if (!f?.finished) continue;
      const g = f.event;
      if (g == null || g < lo || g > hi) continue;
      if (f.team_h_score == null || f.team_a_score == null) continue;
      bump(f.team_h, f.team_h_score, f.team_a_score);
      bump(f.team_a, f.team_a_score, f.team_h_score);
    }
    return acc;
  }, [fixtures, gwRange]);

  const rows = useMemo(() => {
    if (!gwRange || !shotIndex?.byTeam) return base;
    const [lo, hi] = gwRange;
    const idByShort = new Map(base.map(r => [r.short, r.id]));
    const teamIdOf = sh => idByShort.get(sh);
    const F = shotIndex.fields || {};
    const inRange = sh => { const g = sh[F.gw]; return g != null && g >= lo && g <= hi; };
    const agg = short => {
      const ti = shotIndex.teams.indexOf(short);
      if (ti < 0) return null;
      const forr = (shotIndex.byTeam.get(ti) || []).filter(inRange);
      const agst = (shotIndex.byOpp.get(ti) || []).filter(inRange);
      /* TALID I LEIKJUM, EKKI UMFERDUM — TVOFOLD UMFERD ER TVEIR LEIKIR.
         Adur var talid `games.add(sh[F.gw])`, thad er EINKVAEMAR UMFERDIR,
         medan pipeline-skrain sem thessi tafla speglar deilir med
         `t.matches` (fetch-bsd-teams.mjs). I tvofaldri umferd spilar lid
         TVO leiki i EINNI umferd, svo nefnarinn var helmingi of lagur og
         xg_pg / xgc_pg / bc_pg blesu upp um ~2x hja theim lidum — og
         taflan var thar med osammala skranni sem hun a ad spegla.
         Leikur er audkenndur af (umferd, motherji): fyrir SKOT LIDSINS er
         motherjinn `opp`, fyrir SKOT A ThAD er hann `team`.            */
      const games = new Set();
      for (const sh of forr) games.add(`${sh[F.gw]}:${sh[F.opp]}`);
      for (const sh of agst) games.add(`${sh[F.gw]}:${sh[F.team]}`);
      /* LEIKJAFJOLDINN KEMUR NU UR fixtures.json THEGAR HANN ER TIL.
         Lykillinn `umferd:motherji` getur EKKI adgreint tvo leiki gegn
         SAMA lidi i somu umferd — sjaldgaeft en mogulegt thegar frestadur
         leikur er settur i tvofalda umferd. Tha rynna badir leikirnir
         saman i EINN og nefnarinn verdur of lagur, svo xg_pg / xgc_pg /
         bc_pg BLASA UPP. Skotin bera engan leikja-lykil (adeins umferd,
         lid og motherja), svo thau geta ekki leyst thetta sjalf — en
         `fixtures.json` veit nakvaemlega hve margir leikir voru spiladir.
         Skot-lykillinn er hafdur sem varaleid ef urslit vantar.        */
      const fxN = fixAgg?.get(teamIdOf(short))?.n || 0;
      const n = fxN || games.size || 0;
      if (!n) return null;
      const sum = (arr, f) => arr.reduce((a, x) => a + (f(x) || 0), 0);
      const xgF = sum(forr, x => x[F.xg]), xgA = sum(agst, x => x[F.xg]);
      const BC = 0.18;
      return {
        xg_pg: +(xgF / n).toFixed(2), xgc_pg: +(xgA / n).toFixed(2),
        bc_pg: +(forr.filter(x => (x[F.xg] || 0) >= BC).length / n).toFixed(2),
        bc_against_pg: +(agst.filter(x => (x[F.xg] || 0) >= BC).length / n).toFixed(2),
        xg_per_shot: forr.length ? +(xgF / forr.length).toFixed(3) : null,
        xg_per_shot_against: agst.length ? +(xgA / agst.length).toFixed(3) : null,
      };
    };
    return base.map(r => {
      const a = agg(r.short);
      /* URSLITIN i bilinu — sjalfstaed fra skotunum. Lid sem spiladi engan
         LOKINN leik faer null, ekki 0.                                  */
      const fx = fixAgg?.get(r.id) || null;
      const res = fx && fx.n ? {
        goals_pg:    +(fx.gf / fx.n).toFixed(2),
        conceded_pg: +(fx.ga / fx.n).toFixed(2),
        cs_pct:      +(100 * fx.cs / fx.n).toFixed(1),
        played:      fx.n,
      } : { goals_pg: null, conceded_pg: null, cs_pct: null, played: null };

      /* Lid an skota i bilinu fa null — EKKI 0. "Spiladi ekki" og
         "skaut ekki" eru ekki sama hlutid (6i).                       */
      const shots = a || { xg_pg: null, xgc_pg: null, bc_pg: null, bc_against_pg: null,
                           xg_per_shot: null, xg_per_shot_against: null };
      /* MISMUNIRNIR ERU REIKNADIR UR BILINU SJALFU. Adur voru their
         thvingadir i null thvi annar helmingurinn (mork) fylgdi ekki
         bilinu; nu gera badir. Krefjast BEGGJA — annars vaeri "mork
         umfram xG" reiknad ur morkum eins bils og xG annars.           */
      const gmx = (res.goals_pg != null && shots.xg_pg != null)
        ? +(res.goals_pg - shots.xg_pg).toFixed(2) : null;
      const cmx = (res.conceded_pg != null && shots.xgc_pg != null)
        ? +(res.conceded_pg - shots.xgc_pg).toFixed(2) : null;
      return { ...r, ...shots, ...res, goals_minus_xg: gmx, conceded_minus_xgc: cmx };
    });
  }, [base, gwRange, shotIndex, fixAgg]);

  const defs = useMemo(() => TEAM_STAT_DEFS.filter(d => d.group === group), [group]);
  /* Ef skipt er um flokk og radad var eftir dalki sem er ekki lengur a
     skjanum, situr rodunin i ONSYNILEGRI tolu og taflan litur handahofs-
     kennt ut. Tha er fallid aftur a fyrsta dalk flokksins.              */
  useEffect(() => {
    if (sort.key !== "__name" && !defs.some(d => d.key === sort.key))
      setSort({ key: defs[0]?.key || "__name", dir: defs[0]?.hi === false ? "asc" : "desc" });
  }, [group, defs, sort.key]);

  const sorted = useMemo(() => sortTeamRows(rows, sort.key, sort.dir), [rows, sort]);

  /* BESTA OG VERSTA GILDID i hverjum dalki — litud, thvi 20 raedir af
     tveggja aukastafa tolum eru olæsilegar an akkeris. `hi` raedur hvor
     endinn er graenn; an thess vaeri myndin ROng fyrir allt sem lidid
     faer A SIG (haerra = verra). Sama regla og i Compare.jsx.           */
  const ext = useMemo(() => {
    const o = {};
    for (const d of defs) {
      const vals = rows.map(d.get).filter(v => typeof v === "number");
      if (vals.length < 3) continue;
      o[d.key] = { min: Math.min(...vals), max: Math.max(...vals) };
    }
    return o;
  }, [defs, rows]);

  const cellStyle = (d, v) => {
    /* OFULLKOMNIR DALKAR FA ENGA BESTA/VERSTA MERKINGU.
       Merkingin er FULLYRDING ("thetta er besta vornin i deildinni") og
       xG/xGC geta ekki borid hana: theim vantar ~19% og undirtalningin er
       MISJOFN milli lida, thvi hun raest af thvi hve margir foru ur
       deildinni fra hverju lidi. Maelt daemi: Leeds maelist med LAEGSTA
       xGC i deildinni (0,70) medan raunveruleg mork a sig eru 1,47 —
       graen merking thar hefdi sagt notandanum ad Leeds hefdi att bestu
       vaentu vornina, sem er gervi.
       Tolurnar standa afram (thaer eru gagnlegar i samanburdi og
       gula haus-merkingin segir fra fyrirvaranum); thad er FULLYRDINGIN
       sem er tekin ut. Villandi mynd er verri en engin mynd.           */
    if (d.incomplete) return null;
    const e = ext[d.key];
    if (e == null || typeof v !== "number" || e.max === e.min) return null;
    const good = d.hi === false ? e.min : e.max;
    const bad = d.hi === false ? e.max : e.min;
    if (v === good) return S.best;
    if (v === bad) return S.worst;
    return null;
  };

  const fmt = (d, v) => {
    if (v == null) return "—";
    if (d.pct) return `${(v * 100).toFixed(d.dec >= 3 ? 1 : 0)}%`;
    return v.toFixed(d.dec ?? 2);
  };

  const head = (key, label, title, right = true) => (
    <th key={key} title={title}
      style={{ ...S.th, ...(right ? S.thRight : S.thName),
               ...(TEAM_STAT_BY_KEY[key]?.incomplete ? S.thIncomplete : null),
               ...(sort.key === key ? S.thOn : null) }}
      onClick={() => setSort(s => s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: TEAM_STAT_DEFS.find(d => d.key === key)?.hi === false ? "asc" : "desc" })}>
      {label}{sort.key === key ? (sort.dir === "asc" ? " ↑" : " ↓") : ""}
    </th>
  );

  const missing = !teamForm && !luck && !teamShots && !bsdTeams;
  /* NYLIDAR EIGA ENGA ROD I ENSKU URVALSDEILDINNI I FYRRA, svo hver einasta
     tala theirra er "—". Autt an skyringar les eins og NULL SKOT A SIG, sem
     vaeri versta mislesturinn i thessari toflu einmitt af thvi ad hun a ad
     velja markvord. Nofnin eru leidd UT UR GOGNUNUM, ekki handskrifud —
     annars staðnar listinn vid naestu uppfaerslu deildarinnar.            */
  const promoted = useMemo(
    () => rows.filter(r => TEAM_STAT_DEFS.every(d => d.get(r) == null)).map(r => r.short),
    [rows]);

  return (
    <section style={S.card}>
      <div style={S.headRow}>
        <div>
          <h2 style={S.h2}>{"Teams"}</h2>
          <div style={S.sub}>
            {teamForm?.season ? `${teamForm.season} · ` : ""}
            {rows.length} {"teams · full season"}
          </div>
        </div>
      </div>

      {/* TVEIR SKYRINGAR-MALSGREINAR VORU FJARLAEGDIR 11.8.2026 ad beidni
          notandans ("Taktu thetta ut"): almenn kynning a thvi hvad taflan
          er, og BSD-skyringin a stora-faerum. VARNADAR-textinn her ad nedan
          stendur AFRAM — hann er ekki skyring heldur VARUD um dalk sem er
          ekki fylltur, og an hans les tomur dalkur eins og "engar stórar
          faerir" i stad "engin gogn" (CLAUDE.md kafla 8).                */}
      {bsdTeams ? null : (
        <p style={S.warn}>
          <b>{"Big chances faced is not filled in yet."}</b>{" The zones in this table come from "}
          {"ESPN, which gives the position of every shot but no expected-goals value for it, so "}
          {"nothing here can separate a good chance from a hopeful one. "}
          <b>{"Close-range faced"}</b>{" is the measured stand-in and carries its own name. "}
          {"The real column is one fetch away — "}<code style={S.code}>{"BSD_KEY=… node scripts/fetch-bsd-teams.mjs"}</code>
          {" writes it from the BSD shot map, which does carry per-shot expected goals."}
        </p>
      )}

      {missing ? (
        <p style={S.note}>{"Team data has not loaded."}</p>
      ) : (
        <>
          {/* UMFERDAR-BIL. Hreyfir SKOT-dalkana (xG, big chances, xG/skot)
              — thad eru einu lids-tolurnar sem eru til per umferd. Hinir
              eru timabils-summur og bera `season`.                      */}
          <div style={S.gwBar}>
            {/* ALLTAF SYNILEGT, EKKI FALID BAK VID TAKKA (11.8.2026 ad
                beidni). Samanbrotið sparadi 44 px (maelt 8.8.) en kostadi
                thad ad valarinn var osynilegur thangad til smellt var —
                og hann er adalstyringin i thessum flipa. Plássið er
                odyrara en styring sem sest ekki.                        */}
            <span style={S.gwToggle}>{"Gameweeks"}</span>
            {gwRange && (
              <>
                <span style={S.gwNow}>GW {gwRange[0]}–{gwRange[1]}</span>
                <button style={S.gwClear} onClick={() => setGwRange(null)}>{"whole season"}</button>
              </>
            )}
            {gwRange && (
              <span style={S.gwWarn}>
                {"goals, conceded, clean sheets and the shot columns follow the range — "
                 + "shots faced, corners, fouls and cards are season totals"}
              </span>
            )}
          </div>
          {(
            <div style={S.gwBoxes} role="group" aria-label={"Select gameweeks"}>
              {Array.from({ length: 38 }, (_, i) => i + 1).map(n => {
                const on = gwRange && n >= gwRange[0] && n <= gwRange[1];
                const edge = gwRange && (n === gwRange[0] || n === gwRange[1]);
                return (
                  <button key={n} title={`GW ${n}`} aria-pressed={!!on}
                    style={{ ...S.gwBox, ...(on ? S.gwBoxOn : {}),
                             ...(edge ? S.gwBoxEdge : {}) }}
                    onClick={() => setGwRange(r => {
                      if (!r || r[0] !== r[1]) return [n, n];
                      return n < r[0] ? [n, r[0]] : [r[0], n];
                    })}>{n}</button>
                );
              })}
            </div>
          )}

          <div style={S.groupRow}>
            {TEAM_GROUPS.map(g => (
              <button key={g.key} type="button"
                style={{ ...S.groupBtn, ...(group === g.key ? S.groupOn : null) }}
                onClick={() => setGroup(g.key)}>{g.label}</button>
            ))}
          </div>

          <div style={S.scroll}>
            <table style={S.table}>
              <thead>
                <tr>
                  {head("__name", "Team", "Sort by team", false)}
                  {defs.map(d => head(d.key, d.short, `${d.label}\n\n${d.note}\n\nSource: ${d.src}${d.incomplete ? " (incomplete — see note)" : ""}`))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => (
                  <tr key={r.id}>
                    <td style={{ ...S.tdName, ...(shotIndex ? { cursor: "pointer" } : null),
                                 ...(pick === r.short ? { boxShadow: "inset 3px 0 0 #7b2d8e" } : null) }}
                        onClick={shotIndex ? () => setPick(pick === r.short ? null : r.short) : undefined}
                        title={shotIndex ? "Show this team's shot maps" : undefined}>
                      {Crest ? <Crest team={r} size={14} /> : null}
                      <span style={S.short}>{r.short}</span>
                      <span style={S.name}>{r.name || ""}</span>
                    </td>
                    {defs.map(d => {
                      const v = d.get(r);
                      return (
                        <td key={d.key} style={{ ...S.td, ...(cellStyle(d, v) || {}) }}>
                          {fmt(d, v)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* SKOTAKORT LIDSINS — BADAR HLIDAR.
              Taflan segir HVE MORG skot lidid faer; kortid segir HVADAN.
              "A sig"-kortid er thad sem raedur markvardar-/varnarvali og er
              thvi fyrst: 12 langskot og 9 teigsskot eru sami dalkur i
              toflunni en gerolikt mal a vellinum — nakvaemlega thad sem
              skyringin efst i thessum flipa heldur fram.                */}
          {shotIndex && pick && (() => {
            const ti = shotIndex.teams.indexOf(pick);
            if (ti < 0) return null;
            const against = shotIndex.byOpp.get(ti) || [];
            const forr = shotIndex.byTeam.get(ti) || [];
            if (!against.length && !forr.length) return null;
            const row = sorted.find(r => r.short === pick);
            return (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #e6e6ea" }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>
                  {row?.name || pick}{" — shot maps "}
                  <span style={{ fontWeight: 400, opacity: 0.65, fontSize: 12 }}>
                    {"2025/26 · bubble size = xG · goal at top"}</span>
                </div>
                <div style={{ fontSize: 12, color: "#6a6a72", marginBottom: 10 }}>
                  {"Faced is the keeper-and-defence question; taken is the attack. "}
                  {"Only 2025/26 has a shot map, so a promoted side has none — and none means no data."}
                </div>
                <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{"Shots faced"}</div>
                    <ShotMap shots={against} calib={shotIndex.calib} width={300} label={`${pick} faced`} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{"Shots taken"}</div>
                    <ShotMap shots={forr} calib={shotIndex.calib} width={300} label={`${pick} taken`} />
                  </div>
                </div>
              </div>
            );
          })()}

          {promoted.length > 0 && (
            <p style={S.note}>
              <b>{promoted.join(", ")}</b>{promoted.length > 1 ? " have " : " has "}
              {"no row here: they did not play in the Premier League last season, so "}
              {"every number is missing rather than zero. Their first numbers arrive once "}
              {"the season is under way."}
            </p>
          )}

          <div style={S.legend}>
            <span style={{ ...S.chip, ...S.best }}>{"best"}</span>
            <span style={{ ...S.chip, ...S.worst }}>{"worst"}</span>
            <span style={S.legendTxt}>
              {"Best and worst follow the column, not the size: for everything a team concedes, "}
              {"lower is better — except long shots faced, where higher is better. "}
              <b style={{ color: "#8a6100" }}>{"Amber headers"}</b>
              {" mark numbers that are known to be incomplete — compare them between teams, "}
              {"do not read them as absolute."}
            </span>
          </div>

          <div style={S.srcRow}>
            {teamForm && <span style={S.src}>{"Shots, goals, cards, clean sheets — football-data E0, 380 matches"}</span>}
            {luck && <span style={S.src}>{"xG and xGC — FPL player totals, roughly 19% short (players who left the league)"}</span>}
            {bsdTeams && <span style={S.src}>
              {`Big chances and xG per shot — BSD shot map, ${bsdTeams.matches || 0} matches (2025/26 only)`}
            </span>}
            {teamShots && <span style={S.src}>
              {`Shot zones — ESPN commentary, ${teamShots.matches || 0} matches`}
              {teamShots.no_zone ? ` (${teamShots.no_zone} shots carried no zone text and are counted in the totals only)` : ""}
            </span>}
          </div>
        </>
      )}
    </section>
  );
}

const S = {
  /* UMFERDAR-VALARINN — STILARNIR VORU ALDREI TIL (lagad 11.8.2026).
     `S.gwBar`, `S.gwBox`, `S.gwBoxOn` og fjorir adrir voru NOTADIR i
     markup-inu en HVERGI SKILGREINDIR, svo `{...undefined}` breiddist ut i
     ekkert og allir 38 kassarnir teiknudust sem berur texti: "123456789..."
     i einni bendu, an ramma og an lits a valdi bili. Notandinn sa thetta
     strax og sagdi "eg vill ad valdar umferdir litist eins og i hinum
     gluggum".

     ESBUILD OG PROFIN SAGU THETTA ALDREI: `S.gwBox` er gild uppfletting sem
     skilar `undefined`, og `{...undefined}` er logleg JS. Thetta er sami
     flokkur og hvitur skjar sem esbuild samthykkir (CLAUDE.md kafla 2) —
     og hann fannst med thvi ad HORFA A SKJAINN, ekki med thvi ad lesa koda.

     Litirnir eru TEKNIR UR PlayerList.jsx svo baedi vidmotin lesist eins:
     valid bil er ljosfjolublatt (#e8e2ee / #cdbcd8), endarnir fylltir
     fjolubláir. Vordur: tests/team-gw.mjs.                              */
  gwBar:{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap",
          padding:"7px 0 2px" },
  gwToggle:{ border:"none", background:"none", padding:0, cursor:"pointer",
             font:"inherit", fontSize:11.5, fontWeight:700, color:C.text2,
             display:"inline-flex", alignItems:"center", gap:4 },
  gwNow:{ fontFamily:mono, fontSize:11, color:C.purple, fontWeight:700 },
  gwClear:{ border:`1px solid ${C.border}`, background:"#fff", color:C.text2,
            borderRadius:5, padding:"2px 7px", fontSize:11, cursor:"pointer" },
  gwWarn:{ fontSize:10.5, color:C.text3 },
  gwBoxes:{ display:"flex", gap:1, flexWrap:"nowrap", overflowX:"auto",
            padding:"2px 0 6px" },
  gwBox:{ flex:"1 1 0", minWidth:19, height:18, border:`1px solid ${C.border}`,
          background:"#fafafb", color:C.text3, borderRadius:2, cursor:"pointer",
          fontSize:9, padding:0, lineHeight:"16px", fontFamily:mono },
  gwBoxOn:{ background:"#e8e2ee", color:C.purple, border:"1px solid #cdbcd8" },
  gwBoxEdge:{ background:C.purple, color:"#fff", border:`1px solid ${C.purple}`,
              fontWeight:700 },

  card: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 12 },
  headRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  h2: { margin: 0, fontSize: 16, fontWeight: 700, color: C.text },
  sub: { fontSize: 11.5, color: C.text3, marginTop: 2 },
  note: { fontSize: 11.5, color: C.text2, background: C.cardAlt, border: `1px solid ${C.border}`,
    borderRadius: 8, padding: "8px 10px", margin: "10px 0 0", lineHeight: 1.45 },
  warn: { fontSize: 11.5, color: "#7a5600", background: C.amberBg, border: "1px solid #f0dcae",
    borderRadius: 8, padding: "8px 10px", margin: "8px 0 0", lineHeight: 1.45 },
  groupRow: { display: "flex", gap: 4, flexWrap: "wrap", margin: "12px 0 8px" },
  groupBtn: { border: "none", background: "transparent", color: C.text2, borderRadius: 5,
    padding: "4px 9px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  groupOn: { background: "#f1e9f2", color: C.purple },
  scroll: { overflowX: "auto" },
  table: { borderCollapse: "separate", borderSpacing: 0, width: "100%", fontSize: 11.5 },
  th: { position: "sticky", top: 0, background: C.cardAlt, fontSize: 10.5, fontWeight: 700,
    color: C.text2, padding: "5px 7px", cursor: "pointer", userSelect: "none",
    whiteSpace: "nowrap", borderBottom: `1px solid ${C.border}`, textAlign: "left" },
  thRight: { textAlign: "right" },
  thOn: { color: C.purple },
  /* OFULLKOMIN TALA VERDUR AD SJAST SEM SLIK A SKJANUM, ekki adeins i
     tooltip-i. xG og xGC eru kerfisbundid ~19% of lag (leikmenn sem foru
     ur deildinni vantar i FPL-summuna) og tala sem er ROng i thekktri att
     ma ekki lita eins ut og tala sem er rett. Litur en EKKI nytt tákn:
     †-merkid var tekid ut samdaegurs ad beidni notandans, svo ad baeta
     vid odru tákni vaeri ad ganga til baka i sama vanda.                */
  thIncomplete: { color: "#8a6100" },
  /* LIDID VERDUR AD HALDAST A SKJANUM. Taflan ber 22 dalka og skrunar
     larett innan sins kassa; an frysts fyrsta dalks veit madur ekki hvada
     rod hann er ad lesa thegar hann er kominn ut i "langskot a sig" —
     og thad er einmitt dalkurinn sem madur skrunar ad.

     BAKGRUNNURINN ER SKILYRDI, EKKI SKRAUT: `background:"inherit"` a
     frystu holfi erfir GAGNSAETT fra rod sem hefur engan eigin lit, og
     tha skruna tolurnar SYNILEGA UNDIR lidsheitinu. Su villa var maeld i
     leikmannalistanum 8.8.2026 ("6*Gabriel +GBP1.3") — hún er ekki
     endurtekin hér: liturinn er GEFINN BEINT.                            */
  thName: { position: "sticky", left: 0, zIndex: 2, background: C.cardAlt },
  tdName: { position: "sticky", left: 0, zIndex: 1, background: C.card,
    display: "flex", alignItems: "center", gap: 5, padding: "4px 7px",
    borderBottom: "1px solid #f4f4f6", whiteSpace: "nowrap",
    borderRight: `1px solid ${C.border}` },
  short: { fontFamily: mono, fontWeight: 700, fontSize: 11.5, color: C.text },
  name: { fontSize: 11, color: C.text3 },
  td: { textAlign: "right", fontFamily: mono, padding: "4px 7px", color: C.text2,
    borderBottom: "1px solid #f4f4f6", whiteSpace: "nowrap" },
  best: { background: C.greenBg, color: "#0a5c3e", fontWeight: 700 },
  worst: { background: "#fdecee", color: "#8f2230", fontWeight: 700 },
  legend: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 10 },
  chip: { fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "1px 6px" },
  legendTxt: { fontSize: 11, color: C.text3 },
  srcRow: { display: "flex", flexDirection: "column", gap: 2, marginTop: 8 },
  src: { fontSize: 10.5, color: C.text3 },
  code: { fontFamily: mono, fontSize: 10.5, background: "#fff", padding: "1px 4px",
    borderRadius: 3, border: `1px solid ${C.border}` },
};
