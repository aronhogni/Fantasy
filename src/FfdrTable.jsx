/* ============================================================
   TEAMS — FFDR-TAFLAN

   Flutt ur `App.jsx` 11.8.2026 (F1). Hun er ALVEG PROPS-DRIFIN — engin
   state, engin sokn, ekkert samhengi — svo hun var au ovaentasta 200 lina
   blokkin til ad finna inni i 4.600-lina skra.

   ThRJAR REGLUR SEM ThESSI TAFLA VER OG MEGA EKKI TAPAST:

   1. LITURINN VERDUR AD SEGJA ThAD SAMA OG TALAN. Hvert holf faer `tierOf(d)`
      — ALGILT threp, ekki afstaett innan lids. Afstaed threp voru MAELD og
      HOFNUD (hentu ~30% af merkinu og letu hvert lid nota alla litina).
      Vordur: `tests/ffdr-table.mjs` les tofluna AF SKJANUM og krefst thess ad
      liturinn og talan segi thad sama.
   2. AUD UMFERD SLITUR GRAENA RUNU (`greenRuns`): blank = 0 stig, svo runa
      sem "heldur afram" yfir auda umferd vaeri login. `null >= 2` er `false`
      i JS, svo `!= null` er profad serstaklega.
   3. RAMMINN KREFST `borderSpacing: 0` OG 2px gagnsæs ramma a hverju holfi —
      annars slitnar hann milli holfa. Og grunnstillinn skrifar ALLAR fjorar
      hlidar/horn BERUM ORDUM: blondun styttingar og langritunar
      (`borderRadius` + `borderTopLeftRadius`) gaf 14 React-vidvaranir um leid
      og haegt var ad VELJA umferdir, thvi runur koma og fara vid hverja
      breytingu og React fjarlaegir longhand-gildin i odefineradri rod.
   ============================================================ */
import React, { useState } from "react";
import { tierOf, TIER_BG, TIER_FG, TIER_NAME, greenRuns } from "./model.js";
import { interp } from "./interp.js";
import { C, S } from "./appStyles.js";
import { Crest } from "./Crest.jsx";

export default function FfdrTable({ teams, fixByTeamGw, teamById, diffOf, from, span, maxGw, onPickTeam }) {
  const [pos, setPos] = useState(2);   // 2 = varnar-hópur, 4 = sóknar-hópur
  /* ---------- EIGID UMFERDABIL ----------
     Adur var bilid NEGLT vid timalinuna (`from`/`span` ur `tlStart`/
     `tlWindow`), svo eina leidin til ad sja GW2-10 var ad skruna
     timalinunni — og tha faerdist hun lika. Notandinn bad beint um ad
     geta valid bilid HER. Sama vidmot og i "Teams — FFDR" og i Player
     stats: −/+ faera endann, "pick" opnar kassarod, fyrsti smellur setur
     upphaf og annar endi, "reset" fer aftur i timalinuna.              */
  const [range, setRange] = useState(null);         // [fra, til] eda null
  const [picking, setPicking] = useState(false);
  const gFrom = range ? range[0] : from;
  const gTo   = range ? range[1] : Math.min(from + span - 1, maxGw);
  const gws = Array.from({ length: Math.max(0, gTo - gFrom + 1) }, (_, i) => gFrom + i)
    .filter(g => g >= 1 && g <= maxGw);

  /* ---------- RODUN EFTIR SOKN EDA VORN ----------
     BADAR tolur eru reiknadar fyrir hvert lid, ekki adeins su sem er
     valin i litunum. Notandinn bad um ad "rada eftir attack og defence
     difficulty" — thad kraefst thess ad BADAR seu til samtimis, annars
     vaeri rodun eftir sokn adeins moguleg medan sokn er lituð.
     `sortBy` er dalkurinn, `dir` attin. LAEGRA = LETTARA, svo "asc" er
     sjalfgefid: lettustu leikirnir efst.                               */
  const [sortBy, setSortBy] = useState("def");      // "def" | "att" | "team"
  const [dir, setDir] = useState("asc");
  const sortOn = key => {
    if (sortBy === key) { setDir(d => d === "asc" ? "desc" : "asc"); return; }
    /* DAUDUR ThRIHYRNINGUR FJARLAEGDUR (25.8.2026): stod
       `key === "team" ? "asc" : "asc"` — BADAR greinar eins, svo
       skilyrdid gerdi ekkert. Hegdunin er OBREYTT viljandi: nyr dalkur
       byrjar alltaf i "asc". Athugid ad thetta VAR liklega aetlad ad
       gefa "team" adra sjalfgefna att en tolu-dalkunum; se svo er thad
       BREYTING A HEGDUN og krefst akvordunar, ekki thogullar
       lagfaeringar a thvi sem litur ut eins og innslattarvilla.       */
    setSortBy(key); setDir("asc");
  };
  const arrow = k => sortBy !== k ? "" : (dir === "asc" ? " ↑" : " ↓");

  const avgFor = (tid, p) => {
    let n = 0, sum = 0;
    for (const g of gws) for (const f of (fixByTeamGw[tid]?.[g] || [])) {
      const d = diffOf(tid, f, p) ?? f.fdr;
      if (d != null) { sum += d; n++; }
    }
    return n ? sum / n : null;
  };

  const rows = (teams || []).map(t => {
    const cells = gws.map(g => {
      const fxs = fixByTeamGw[t.id]?.[g] || [];
      if (!fxs.length) return { blank: true };
      return {
        multi: fxs.length > 1,
        /* ============================================================
           OTOLULEG THYNGD MA ALDREI VERDA THREP (lagad 25.8.2026)

           Hér stod `d: diffOf(...) ?? f.fdr` an nokkurs varnar. `??`
           tekur adeins vid null/undefined — hun hleypir OLLU odru i
           gegn, og `f.fdr` er ekki trygging: FPL sendir **`null`**
           thegar leikur er ometinn.

           BADAR UTKOMURNAR ERU RANGAR, OG SU LIKLEGRI ER VERRI:
             `undefined` -> Math.max -> **NaN** -> `tierOf` = thyngsta
                            threpid (dokkraudt), tooltip "· undefined"
             `null`      -> Math.max -> **0**   -> `tierOf` = LETTASTA
                            threpid (dokkgraent), tooltip "· null"
           FPL sendir `null`, svo sjalfgefna utkoman er ad ometinn
           leikur birtist sem **audveldasti leikur toflunnar**. Thad er
           ekki bara rangur litur heldur rong RADGJOF, i toflunni sem er
           til thess ad segja hvada leikir eru audveldir.

           `FixStrip` var lagfaerd fyrir nakvaemlega thetta 25.8. og
           thessi skra gleymdist — sama villa, tveir stadir. `avgFor` i
           thessari SOMU skra vardi sig thegar (`if (d != null)`), svo
           skrain var osammala sjalfri ser.

           `null` fer thvi alla leid og hvert stig ber hana: hólf sem á
           enga tolu er BLANKT, ekki litad. */
        items: fxs.map(f => {
          const raw = diffOf(t.id, f, pos) ?? f.fdr;
          return { f, d: Number.isFinite(+raw) ? +raw : null };
        }),
      };
    });
    /* `avg` og `played` VORU REIKNUD HER OG ENGINN LAS THAU (fjarlaegt
       25.8.2026). Eini neytandinn afbyggir `{ t, cells, def, att, n }`.
       `avg` var ekki einu sinni tvitekning a `def`/`att` — hun fylgdi
       VALINNI stodu, svo hun var THRIDJA talan sem hvergi sast. */
    return { t, cells,
             def: avgFor(t.id, 2), att: avgFor(t.id, 4),
             n: cells.filter(c => !c.blank).length };
  }).sort((a, z) => {
    if (sortBy === "team") return (dir === "asc" ? 1 : -1) * String(a.t.short).localeCompare(String(z.t.short));
    /* VANTAR (tomt bil) RADAST ALLTAF NEDST, i BADAR attir — sama regla
       og i leikmannatoflunni. `?? 9` eitt og ser hefdi fleytt theim UPP
       i "desc" og latid lid an leikja lita ut eins og thau thyngstu.   */
    const av = a[sortBy], zv = z[sortBy];
    if (av == null && zv == null) return a.t.id - z.t.id;
    if (av == null) return 1;
    if (zv == null) return -1;
    return (dir === "asc" ? 1 : -1) * (av - zv) || a.t.id - z.t.id;
  });
  const POSB = [[2,"DEFENCE"],[4,"ATTACK"]];   // tveir hópar — GK+DEF og MID+FWD
  return (
    <section style={S.card}>
      <div style={S.recHead}>
        <h2 style={S.h2}>{"FFDR — fixture difficulty"}</h2>
        <div style={S.ffdrPos}>
          {POSB.map(([v,l]) => (
            <button key={v} style={{ ...S.ffdrPosBtn, ...(pos === v ? S.ffdrPosOn : {}) }}
              onClick={() => setPos(v)}>{l}</button>
          ))}
        </div>
      </div>
      {/* UMFERDABILID — sama vidmot og annars stadar i appinu. */}
      <div style={S.ffdrBar}>
        <button style={S.ffdrStep} title={"One gameweek fewer"}
          onClick={() => setRange([gFrom, Math.max(gFrom, gTo - 1)])}>−</button>
        <span style={S.ffdrNow}>{"GW"} {gFrom}{gFrom !== gTo ? `–${gTo}` : ""}
          <span style={S.ffdrN}>{gTo - gFrom + 1}</span></span>
        <button style={S.ffdrStep} title={"One gameweek more"}
          onClick={() => setRange([gFrom, Math.min(maxGw, gTo + 1)])}>+</button>
        <button style={S.ffdrPick} aria-expanded={picking}
          onClick={() => setPicking(v => !v)}>{picking ? "hide" : "pick"}</button>
        {range && (
          <button style={S.ffdrPick} title={"Back to the timeline range"}
            onClick={() => { setRange(null); setPicking(false); }}>{"reset"}</button>
        )}
      </div>
      {picking && (
        <div style={S.ffdrBoxes} role="group" aria-label={"Select gameweeks"}>
          {Array.from({ length: maxGw }, (_, i) => i + 1).map(n => {
            const on = n >= gFrom && n <= gTo;
            return (
              <button key={n} title={`GW ${n}`} aria-pressed={on}
                style={{ ...S.ffdrBox, ...(on ? S.ffdrBoxOn : {}) }}
                onClick={() => setRange(r => {
                  const cur = r || [gFrom, gTo];
                  if (cur[0] !== cur[1]) return [n, n];
                  return n < cur[0] ? [n, cur[0]] : [cur[0], n];
                })}>{n}</button>
            );
          })}
        </div>
      )}
      <div style={S.muted}>
        GW{gws[0]}–{gws[gws.length-1]} {"· click"} <b>{"Def"}</b> {"or"} <b>{"Att"}</b> {"to sort by that difficulty (lower = easier)."}
        <b> {"This is an ABSOLUTE scale"}</b> {"— comparable between teams, so a weak team is red even in an easy match. That is right for \"who should I buy\". The fixture tiles on player cards are"} <b>{"relative within the team"}</b> {"— for \"when should I play him\"."}
      </div>
      <div style={S.ffdrScroll}>
        <table style={S.ffdrTable}>
          <thead>
            <tr>
              <th style={{ ...S.ffdrTh, ...S.ffdrThTeam, cursor:"pointer" }}
                  onClick={() => sortOn("team")} title={"Sort by team"}>{"Team"}{arrow("team")}</th>
              {gws.map(g => <th key={g} style={S.ffdrTh}>{g}</th>)}
              {/* TVEIR RODUNAR-DALKAR. Adur var EINN "Avg." sem fylgdi
                  lita-valinu, svo ekki var haegt ad rada eftir sokn medan
                  vornin var lituð. Nu eru badar tolurnar synilegar og
                  hvor sem er ma rada — thad var beidnin.               */}
              <th style={{ ...S.ffdrTh, ...S.ffdrThSort, ...(sortBy === "def" ? S.ffdrThOn : {}) }}
                  onClick={() => sortOn("def")}
                  title={"Average defensive FFDR over the range — click to sort (lower = easier)"}>
                {"Def"}{arrow("def")}</th>
              <th style={{ ...S.ffdrTh, ...S.ffdrThSort, ...(sortBy === "att" ? S.ffdrThOn : {}) }}
                  onClick={() => sortOn("att")}
                  title={"Average attacking FFDR over the range — click to sort (lower = easier)"}>
                {"Att"}{arrow("att")}</th>
              <th style={S.ffdrTh} title={"Fixtures in the range. A BLANK is skipped by the average, so fewer fixtures can look easier than they are."}>{"n"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ t, cells, def, att, n }) => {
          /* GRAEN RUNA — 3+ LEIKIR I ROD I GRAENU THREPI FA RAMMA.
             Reiknad A RODINNI, ekki i holfinu: holf veit ekkert um
             nagranna sina. Sjalf reglan er i model.js (`greenRuns`) af
             somu astaedu og allt annad reiknad — profin keyra sama kodann.  */
          /* `worstOf` skilar `null` thegar ENGIN tala er i holfinu —
             tha er thad medhondlad eins og audt, ekki litad. */
          const worstOf = (c) => {
            const ds = (c.items || []).map(x => x.d).filter(x => x != null);
            return ds.length ? Math.max(...ds) : null;
          };
          const run = greenRuns(cells.map(c => {
            if (c.blank) return null;
            const w = worstOf(c);
            return w == null ? null : tierOf(w);
          }));
          return (
              <tr key={t.id}>
                <td style={S.ffdrTeamCell}>
                  <button style={S.ffdrTeamBtn} onClick={() => onPickTeam && onPickTeam(t.id)}>
                    <Crest team={t} size={13} />{t.short}
                  </button>
                </td>
                {cells.map((c, i) => {
                  if (c.blank) return <td key={i} style={S.ffdrBlank} title={"Blank gameweek"}>—</td>;
                  const worst = worstOf(c);
                  if (worst == null) return (
                    <td key={i} style={S.ffdrBlank}
                      title={"No difficulty for this fixture — neither our own model nor FPL has rated it."}>{"—"}</td>);
                  const tier = tierOf(worst);
                  const r = run[i];
                  return (
                    <td key={i} style={{ ...S.ffdrTd, background: TIER_BG[tier], color: TIER_FG[tier],
                          ...(r ? {
                            borderTopColor: C.green, borderBottomColor: C.green,
                            ...(r.first ? { borderLeftColor: C.green } : {}),
                            ...(r.last ? { borderRightColor: C.green } : {}),
                            borderTopLeftRadius: r.first ? 5 : 0, borderBottomLeftRadius: r.first ? 5 : 0,
                            borderTopRightRadius: r.last ? 5 : 0, borderBottomRightRadius: r.last ? 5 : 0,
                          } : {}) }}
                      title={(r ? `${r.len} easy gameweeks in a row — ` : "")
                        + c.items.map(x => `${teamById[x.f.opp]?.short}${x.f.home ? " (h)" : " (a)"} · ${x.d == null ? "—" : x.d}`).join("  |  ")}>
                      {c.items.map((x, k) => (
                        <span key={k} style={S.ffdrOpp}>
                          {teamById[x.f.opp]?.short || "?"}{x.f.home ? "" : <i style={S.ffdrAway}>{"a"}</i>}
                        </span>
                      ))}
                      {c.multi && <span style={S.ffdrDouble}>×2</span>}
                    </td>
                  );
                })}
                {/* Litur a THEIRRI tolu sem er RODAD eftir, svo augad
                    finni dalkinn sem stjornar rodinni. Hin er graa. */}
                <td style={{ ...S.ffdrAvg, ...(sortBy === "def" ? S.ffdrAvgOn : {}) }}>
                  {def == null ? "—" : def.toFixed(2)}</td>
                <td style={{ ...S.ffdrAvg, ...(sortBy === "att" ? S.ffdrAvgOn : {}) }}>
                  {att == null ? "—" : att.toFixed(2)}</td>
                <td style={{ ...S.ffdrAvg, color: n < gws.length ? C.red : C.text3, fontWeight:400 }}
                    title={n < gws.length
                      ? `Only ${n} fixtures in ${gws.length} gameweeks — a BLANK is skipped by the average`
                      : `${n} fixtures in ${gws.length} gameweeks`}>{n}</td>
              </tr>
            );
          })}
          </tbody>
        </table>
      </div>
      <div style={S.ffdrLegend}>
        {TIER_NAME.map((n, i) => (
          <span key={n} style={{ ...S.ffdrChip, background: TIER_BG[i], color: TIER_FG[i] }}>{n}</span>
        ))}
      </div>
    </section>
  );
}
