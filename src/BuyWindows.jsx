/* ============================================================
   BUYWINDOWS.JSX — "BUY WINDOWS": TIMALINA PER LEIKMANN I LEIKMANNAFLIPANUM

   HVERS VEGNA HER OG EKKI I TEAMS-FLIPANUM. FFDR-taflan er per LID og hefur
   EINN staða-rofa (DEFENCE / ATTACK) fyrir alla 20 rodina. Hun getur thvi
   ekki svarad "hvenaer a eg ad kaupa ThENNAN mann": `DIFF_W` er per stada og
   sóknarhopurinn les `marketAttackDiff` (eigin vaent mork) medan varnar-
   hopurinn les `marketDiff` (mork a sig), svo VARNARMADUR OG FRAMHERJI I
   SAMA LIDI FA SITT HVORA TOLU A SAMA LEIK. Her ber hver rod stodu SINS
   leikmanns, og thad er einmitt thad sem taflan getur ekki gert.

   SETTID OG RODIN KOMA UR TOFLUNNI, EKKI UR EIGIN SIUM. Thad er akvordun:
   siurnar (stada, leit, ★ vaktlisti, "hide selected") OG rodunin eftir
   hvaða dálki sem er af 124 eru thegar til vinstra megin i sama flipa. Vill
   madur "topp 40 eftir DC-hittni" radar madur eftir theim dalki i Groups og
   skiptir svo hingad — rodin fylgir. Eigin siur her hefdu verid onnur
   utfaersla af somu siu sem gaeti rekid i sundur (sbr. ImminentPanel, sem
   hefur EIGIN markhopa-reglu og thess vegna ENGAR sior).

   ThRJAR REGLUR SEM ThESSI SY'N VER:

   1. LITURINN ER ALGILDUR (`tierOf`) — sami kvardi og alls stadar annars
      stadar i appinu, svo graent holf hja Sunderland thydir thad sama sem
      graent holf hja Arsenal. GLUGGINN er hins vegar AFSTAEDUR (hans eigid
      medaltal). Bædi eru rett um sina spurningu og bædi eru MERKT sem thad
      i skyringunni: litur = "hversu letttur er leikurinn", gluggi =
      "hvenaer er BEST ad eiga hann".
   2. RAMMINN ER SKRIFADUR I LANGRITUN, ALLAR FJORAR HLIDAR OG OLL FJOGUR
      HORN (`borderTopColor`... `borderTopLeftRadius`...). Blondun styttingar
      og langritunar gaf 14 React-vidvaranir i FFDR-toflunni um leid og haegt
      var ad VELJA umferdir — runur koma og fara vid hverja breytingu og
      React fjarlaegir longhand-gildin i odefineradri rod (CLAUDE.md 8).
      Her er bilid VALJANLEGT fra fyrstu utgafu, svo gildran er til stadar.
   3. RADA-ThAKID ER SAGT A SKJANUM. 587 radir x 38 holf eru 22.000 holf;
      thakid er thvi raunverulegt og "engin thogul thok" gildir.
   ============================================================ */
import React, { useMemo, useState } from "react";
import { TIER_BG, TIER_FG, TIER_NAME, MEASURED_POS } from "./model.js";
import { ffdrSeries, buyWindows, meanDifficulty, relTier,
         MIN_WINDOW, MAX_WINDOWS } from "./buywindow.js";

const C = {
  card:"#ffffff", cardAlt:"#fafafb", border:"#e0e0e4", text:"#1d1d20",
  text2:"#61616b", text3:"#8b8b95", purple:"#37003c", green:"#00b96b",
  amber:"#c98a00", red:"#d92d3c",
};
const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";
const POS = { 1:"GK", 2:"DEF", 3:"MID", 4:"FWD" };
const POS_COLOR = { 1:"#8b5cf6", 2:"#2563eb", 3:"#00b96b", 4:"#d92d3c" };

/* TVEIR KVARDAR, TVAER SPURNINGAR — sja hausinn a `relTier` i buywindow.js.
   „his own" er SJALFGEFID thvi thad er spurningin sem sy'nin er til fyrir:
   se buid ad velja manninn, HVENAER a ad eiga hann. „league" er sama algilda
   kvardinn sem FFDR-taflan notar og svarar hinni spurningunni.          */
const SCALES = [
  ["own",    "his own",  "Colour each gameweek against HIS OWN average — the measured tier widths, shifted so his average week is the neutral grey. This answers \"I have decided on him: when do I buy him?\""],
  ["league", "league",   "Colour on the absolute league scale, the same one the Teams FFDR table uses — comparable between clubs, so a weak team stays red even in its easiest match"],
];
const ORDERS = [
  ["table", "table order", "Keep the order and the filters from the table — sort by any column there first"],
  ["soon",  "next window", "Soonest window first — what to buy now"],
  /* TOOLTIP-ID SAGDI „Biggest gain first" MEDAN RODUNIN NOTAR `score`
     (`gain/(len+3)`) — og thad er ekki ordalag heldur RONG FULLYRDING:
     MAELT prentar `+` HAERRA i naestu rod i 28 af 79 porum med thessari
     rodun, svo taflan les synilega urodud. Rodunin sjalf er RETT (sami
     maelikvardi sem valdi gluggann; tvo eintok af sama vali reka i sundur,
     sja `buyWindows`) — thad var textinn sem laug.                       */
  ["gain",  "best window", "Best window first — ranked by the score that chose the window, so the + on the chips is not in order"],
];
const STEP = 40;                 // hversu margar radir "show more" baetir vid

/* ---------- FJORAR TOLUR I SKYRINGUNNI ERU LEIDDAR, EKKI SKRIFADAR ----------
   Skyringin segir hvers vegna sama gaeda-runa prentar STAERRA `+` a
   varnarmann en a midjumann, og hun gerir thad med fjorum tolum ur
   `MEASURED_POS`: sponn stodunnar yfir throskustigid (DEF 2,19 · MID 1,44) og
   stigin i AUDVELDASTA leiknum (DEF 4,12 · MID 4,23) — sem er punkturinn:
   munurinn er GOLFID, ekki thakid (midjumadurinn er meira ad segja OFAR i
   audveldasta leiknum).

   ThAER ERU REIKNADAR VID TEIKNINGU AF NAKVAEMLEGA ThEIRRI ASTAEDU SEM
   CLAUDE.md 8 skjalar: „MEASURED: the range is 4-10 and NO club has a 1"
   stod i tooltip-i og a skjanum eftir ad FPL hafdi endurnumerad svidid, og
   fost tala um maelda toflu urelist ThOGULT — med ordinu MEASURED framan
   vid. Breytist `MEASURED_POS` fylgir textinn sjalfur.

   AUDVELDASTI LEIKUR = LAEGSTA `d`, ekki `T[0]`: rodin er stigvaxandi i
   `MEASURED_POS` i dag en thad er ekki fullyrding sem skrain gefur.     */
const posPts = pos => MEASURED_POS[pos].slice().sort((a, z) => a.d - z.d).map(x => x.pts);
const ptsSpan = pos => { const v = posPts(pos); return (Math.max(...v) - Math.min(...v)).toFixed(2); };
const ptsEasiest = pos => posPts(pos)[0].toFixed(2);

/* Ein rod = einn leikmadur. Hun er MEMO-ud a (lid, stada, bil) thvi
   utreikningurinn er sa sami fyrir alla leikmenn sama lids i sömu stodu —
   80 utreikningar i stad 587.                                          */
function useWindowIndex(rows, fixByTeamGw, fixDifficulty, from, to) {
  return useMemo(() => {
    const cache = new Map();
    const out = new Map();
    for (const r of rows) {
      const p = r.p;
      const key = `${p.team}|${p.element_type}`;
      let hit = cache.get(key);
      if (!hit) {
        const series = ffdrSeries({ teamId: p.team, pos: p.element_type,
                                    fixByTeamGw, fixDifficulty, from, to });
        hit = { series, meanD: meanDifficulty(series), ...buyWindows(series) };
        cache.set(key, hit);
      }
      out.set(p.id, hit);
    }
    return out;
  }, [rows, fixByTeamGw, fixDifficulty, from, to]);
}

export default function BuyWindows({
  rows, teamById, fixByTeamGw, fixDifficulty, gwNow = 1, maxGw = 38,
  Crest, watch, onWatch, mineIds, onPickPlayer, narrow = false,
}) {
  /* BILID ER VALJANLEGT OG SJALFGEFID "HER OG UT TIMABILID". Fortidin er
     ekki kaup-akvordun, svo `from` byrjar a yfirstandandi umferd — en hun
     er valjanleg thvi i forleik vill madur sja alla 38 og eftir GW20 vill
     madur stundum sja hvar hann VAR audveldur.                          */
  const [range, setRange] = useState(null);
  const [picking, setPicking] = useState(false);
  const from = range ? range[0] : Math.max(1, Math.min(gwNow, maxGw));
  const to   = range ? range[1] : maxGw;
  const gws = useMemo(() => Array.from({ length: Math.max(0, to - from + 1) },
                                       (_, i) => from + i), [from, to]);

  const [order, setOrder] = useState("table");
  const [scale, setScale] = useState("own");
  const [limit, setLimit] = useState(STEP);

  const idx = useWindowIndex(rows, fixByTeamGw, fixDifficulty, from, to);
  const watchSet = useMemo(() => new Set(watch || []), [watch]);
  const mineSet = useMemo(
    () => (mineIds instanceof Set ? mineIds : new Set(mineIds || [])), [mineIds]);

  /* RODUN. "table" heldur rodinni sem kom inn — hun er notandans eigin
     rodun i toflunni og ma ekki hverfa vid ad skipta yfir hingad.
     VANTAR RADAST ALLTAF NEDST, i badar attir (sama regla og i toflunni):
     leikmadur an glugga er ekki "bestur", hann er an gagna.             */
  const ordered = useMemo(() => {
    if (order === "table") return rows;
    const key = r => {
      const w = idx.get(r.p.id)?.windows || [];
      if (!w.length) return null;
      /* SAMI MAELIKVARDI SEM VALDI GLUGGANN (`score`), ekki `gain`. Vaeri
         radad eftir abata vaeri „besti gluggi" annad i rodinni en i leitinni
         — sama tvofeldni sem var villa i `buyWindows` (sja thar).        */
      if (order === "gain") return -Math.max(...w.map(x => x.score));
      /* "next window": sa gluggi sem er NAEST i tima og er ekki buninn.
         Se enginn eftir (allir a undan `from`) radast hann nedst.       */
      const ahead = w.filter(x => x.to >= from).map(x => x.from);
      return ahead.length ? Math.min(...ahead) : null;
    };
    return rows.slice().sort((a, z) => {
      const ka = key(a), kz = key(z);
      if (ka == null && kz == null) return 0;
      if (ka == null) return 1;
      if (kz == null) return -1;
      return ka - kz;
    });
  }, [rows, idx, order, from]);

  const shown = ordered.slice(0, limit);
  const cellW = narrow ? 10 : 16;
  const nameW = narrow ? 120 : 186;

  return (
    <div style={S.wrap}>
      {/* ---------- STYRING ---------- */}
      <div style={S.bar}>
        <div style={S.barGrp} role="group" aria-label={"Gameweek range"}>
          {/* −/+ FAERA ENDANN, EKKI UPPHAFID — SAMA VIDMOT OG I FFDR-TOFLUNNI
              (sama ordalag i `title` lika). Upphafid er „nuna" og er thad sem
              madur vill sjaldnast hreyfa; thad sem madur vill er „naestu 10".
              Tvo vidmot fyrir sama hlut i sama appi er verra en eitt.      */}
          <button style={S.step} title={"One gameweek fewer"}
            onClick={() => setRange([from, Math.max(from, to - 1)])}>{"−"}</button>
          <span style={S.now}>GW {from}{from !== to ? `–${to}` : ""}
            <span style={S.nowN}>{to - from + 1}</span></span>
          <button style={S.step} title={"One gameweek more"}
            onClick={() => setRange([from, Math.min(maxGw, to + 1)])}>{"+"}</button>
          <button style={S.pick} aria-expanded={picking}
            onClick={() => setPicking(v => !v)}>{picking ? "hide" : "pick"}</button>
          {range && (
            <button style={S.pick} title={"Back to: this gameweek to the end of the season"}
              onClick={() => { setRange(null); setPicking(false); }}>{"reset"}</button>
          )}
        </div>
        <div style={S.barGrp} role="group" aria-label={"Colour scale"}>
          <span style={S.barLbl}>{"colour:"}</span>
          {SCALES.map(([k, l, tip]) => (
            <button key={k} title={tip} aria-pressed={scale === k}
              style={{ ...S.ord, ...(scale === k ? S.ordOn : {}) }}
              onClick={() => setScale(k)}>{l}</button>
          ))}
        </div>
        <div style={S.barGrp} role="group" aria-label={"Order"}>
          {ORDERS.map(([k, l, tip]) => (
            <button key={k} title={tip} aria-pressed={order === k}
              style={{ ...S.ord, ...(order === k ? S.ordOn : {}) }}
              onClick={() => setOrder(k)}>{l}</button>
          ))}
        </div>
      </div>
      {picking && (
        <div style={S.boxes} role="group" aria-label={"Select gameweeks"}>
          {Array.from({ length: maxGw }, (_, i) => i + 1).map(n => {
            const on = n >= from && n <= to;
            return (
              <button key={n} title={`GW ${n}`} aria-pressed={on}
                style={{ ...S.box, ...(on ? S.boxOn : {}) }}
                onClick={() => setRange(r => {
                  const cur = r || [from, to];
                  if (cur[0] !== cur[1]) return [n, n];
                  return n < cur[0] ? [n, cur[0]] : [cur[0], n];
                })}>{n}</button>
            );
          })}
        </div>
      )}

      {/* ---------- ThAKID ER SAGT, ALLTAF ThEGAR ThAD BITUR ---------- */}
      <div style={S.count}>
        {"Showing"} <b>{shown.length}</b> {"of"} {ordered.length}
        {ordered.length > shown.length ? <>
          {" — the rest are"} <b>{"not"}</b> {"on screen"}
          <button style={S.more} onClick={() => setLimit(v => v + STEP)}>
            {"show "}{Math.min(STEP, ordered.length - shown.length)}{" more"}</button>
          <button style={S.more} onClick={() => setLimit(ordered.length)}>
            {"show all "}{ordered.length}</button>
        </> : null}
        {". Filters and sorting come from the table."}
      </div>

      {!shown.length ? (
        <div style={S.empty}><b>{"No player matches the filters."}</b></div>
      ) : (
      <div style={S.scroll}>
        {/* RAUN-TOFLU-SEMANTIK. `role`-in eru ekki skraut: rodin er 38 holf
            sem lesa hvorki sem tafla ne listi an theirra, og thau eru lika
            ThAD STODUGA HALDFANG sem profid les rodina med — fyrsta utgafa
            profsins taldi born ("> 30 holf") og hun HVARF um leid og bilid
            var stytt i GW10-20. Haldfang sem breytist med gognunum er ekki
            haldfang.                                                      */}
        <div style={{ minWidth: "max-content" }} role="table"
             aria-label={"Buy windows per player"} aria-rowcount={shown.length + 1}>
          {/* haus: umferdanumerin */}
          <div style={S.head} role="row">
            <div style={{ ...S.nameCell, ...S.headName, width: nameW, minWidth: nameW }}
                 role="columnheader">{"Player"}</div>
            {gws.map(g => (
              <div key={g} role="columnheader" title={`Gameweek ${g}`}
                   style={{ ...S.headCell, width: cellW, minWidth: cellW }}>{g}</div>
            ))}
            {/* HAUSINN SEGIR HVADA KVARDA `+` ER A. Notandinn las `+0,98` hja
                Rice (MID) vid `+2,95` hja tveimur varnarmonnum og spurdi hvort
                thad vaeri villa — og a SAMBAERILEGU tolunni (`mean`) eru hans
                thrir gluggar ThRIR HAESTU a theim skja. Talan var rett, hun
                var bara ekki merkt. Heitid er skrifad her og EKKI a
                lesmata-hnappnum i PlayerList (thann les
                `tests/buy-windows.mjs` med `/^Buy windows$/`).            */}
            <div style={S.headWin} role="columnheader">
              {"Buy windows"}<span style={S.headWinSub}>{" · vs his own average"}</span></div>
          </div>

          {shown.map(r => {
            const p = r.p, t = teamById?.[p.team];
            const rec = idx.get(p.id) || { series: [], windows: [], baseline: null };
            /* Uppflettitafla umferd -> gluggi, byggd EINU SINNI per rod.
               `first`/`last` bera rammann eins og i FFDR-toflunni.      */
            const inWin = new Map();
            rec.windows.forEach((w, wi) => {
              for (let g = w.from; g <= w.to; g++)
                inWin.set(g, { w, wi, first: g === w.from, last: g === w.to,
                               weak: w.weak.includes(g), blank: w.blanks.includes(g) });
            });
            const chrono = rec.windows.slice().sort((a, z) => a.from - z.from);
            /* `windows[0]` ER besti glugginn (valrodin). Merkid les thvi
               rodina, ekki eigin samanburd — tvo eintok af sama vali reka
               i sundur.                                                  */
            const best = rec.windows[0] || null;
            return (
              <div key={p.id} style={S.row} role="row">
                <div style={{ ...S.nameCell, width: nameW, minWidth: nameW,
                              ...(mineSet.has(p.id) ? S.mine : {}) }}>
                  <button style={{ ...S.star, ...(watchSet.has(p.id) ? S.starOn : {}) }}
                    title={watchSet.has(p.id) ? "Remove from the watchlist" : "Add to the watchlist"}
                    onClick={() => onWatch && onWatch(p.id)}>
                    {watchSet.has(p.id) ? "★" : "☆"}</button>
                  {Crest && t ? <Crest team={t} size={13} /> : null}
                  <button style={S.nameBtn} title={"Open the player card"}
                    onClick={() => onPickPlayer && onPickPlayer(p.id)}>{p.web_name}</button>
                  <span style={{ ...S.pos, color: POS_COLOR[p.element_type] }}>
                    {POS[p.element_type]}</span>
                  <span style={S.price}>{(p.now_cost / 10).toFixed(1)}</span>
                  {/* STADAN ER MERKT, EKKI LOGD INN I TOLURNAR — gluggarnir
                      eru um LEIKINA (sja haus buywindow.js).             */}
                  {p.status && p.status !== "a" && (
                    <span style={S.flag} title={`${p.news || "Not fully available"}`
                      + "\n\nInjuries and bans are NOT in the windows — they are about the fixtures."}>{"!"}</span>
                  )}
                </div>
                {rec.series.map(s => {
                  const w = inWin.get(s.gw);
                  /* HANS EIGIN KVARDI ER SJALFGEFINN — sama spurning sem
                     ramminn svarar. Adur var liturinn ALGILDUR medan ramminn
                     var afstaedur, svo besta runa slaks lids var rommud i
                     graenu og MALAD RAUD (sja `relTier`).                */
                  const tier = scale === "own" ? relTier(s.d, rec.meanD) : s.tier;
                  const base = { ...S.cell, width: cellW, minWidth: cellW,
                    background: s.blank ? "#f4f4f6" : s.unknown ? "#f4f4f6"
                                : tier == null ? "#f4f4f6" : TIER_BG[tier],
                    color: tier == null ? C.text3 : TIER_FG[tier] };
                  /* RAMMINN SKRIFAR SOMU ATTA EIGINLEIKA SEM GRUNNSTILLINN —
                     hvorki fleiri ne faerri. Vaeri einn sleppt hér vaeri hann
                     "fjarlaegdur" milli teikninga og React kvartar um thad
                     eina; thess vegna er `transparent` skrifad BERUM ORDUM a
                     hlidar sem eru inni i glugga (ekki endar).            */
                  const ring = w ? {
                    borderTopColor: C.green, borderBottomColor: C.green,
                    borderLeftColor: w.first ? C.green : "transparent",
                    borderRightColor: w.last ? C.green : "transparent",
                    borderTopLeftRadius: w.first ? 4 : 0,
                    borderBottomLeftRadius: w.first ? 4 : 0,
                    borderTopRightRadius: w.last ? 4 : 0,
                    borderBottomRightRadius: w.last ? 4 : 0,
                  } : {};
                  const opps = s.items.map(x => {
                    const os = teamById?.[x.f.opp]?.short || "?";
                    return `${os}${x.f.home ? " (h)" : " (a)"}${x.d == null ? "" : ` · ${x.d}`}`;
                  }).join("  |  ");
                  const title = `GW${s.gw} — ${s.blank ? "blank gameweek (0 points)"
                      : s.unknown ? "no difficulty for this fixture" : opps}`
                    + (s.v == null ? "" : `\n${s.v.toFixed(2)} pts expected for an average ${POS[p.element_type]}`
                        + (rec.baseline == null ? "" : ` (his own average over GW${from}–${to}: ${rec.baseline.toFixed(2)})`))
                    + (s.d == null ? "" : `\ndifficulty ${s.d}`
                        + (rec.meanD == null ? "" : ` · his average difficulty ${rec.meanD.toFixed(2)}`)
                        + ` · colour scale: ${scale === "own" ? "his own" : "league"}`)
                    + (w ? `\n\nInside the buy window GW${w.w.from}–${w.w.to}: +${w.w.gain} pts over the range`
                         + (w.weak ? " — this one is BELOW his average, bench it" : "")
                         + (w.blank ? " — blank, nothing to bench" : "") : "");
                  return (
                    <div key={s.gw} role="cell" style={{ ...base, ...ring }} title={title}>
                      {s.blank ? "–" : s.unknown ? "?" : s.double ? "2" : ""}
                      {/* BEKKJA-MERKID ER PUNKTUR UNDIR HOLFINU, ekki annar
                          litur: liturinn er thegar bundinn (algilt threp) og
                          tveir merkingar-asar i sama lit vaeru olæsilegir. */}
                      {w && w.weak && <span style={S.weakDot} />}
                    </div>
                  );
                })}
                <div style={S.winCell}>
                  {!chrono.length ? (
                    <span style={S.noWin} title={
                      rec.baseline == null
                        ? "No fixture difficulty in this range."
                        : "No stretch of " + MIN_WINDOW + "+ gameweeks stands out from his own average — his fixtures are flat."
                    }>{rec.baseline == null ? "no data" : "flat"}</span>
                  ) : chrono.map((w, i) => (
                    <span key={i} style={{ ...S.chip, ...(w === best ? S.chipBest : {}) }}
                      title={`GW${w.from}–${w.to} · ${w.len} gameweeks`
                        + `\n+${w.gain} pts more than an average ${w.len}-gameweek stretch for him (${w.perGw}/GW)`
                        + `\n${w.mean} pts per gameweek for an average ${POS[p.element_type]} — this one IS comparable between players`
                        + (w.weak.length ? `\nBench: GW${w.weak.join(", GW")}` : "")
                        + (w.blanks.length ? `\nBlank: GW${w.blanks.join(", GW")}` : "")
                        + (w.doubles.length ? `\nDouble: GW${w.doubles.join(", GW")}` : "")}>
                      {w.from}{"–"}{w.to}
                      <b style={S.chipGain}>{"+"}{w.gain.toFixed(2)}</b>
                      {/* SAMBAERILEGA TALAN ER A CHIP-INU, EKKI ADEINS I
                          TOOLTIP-INU. `+gain` er afstaett vid MANNINN og getur
                          thvi ekki radad tveimur monnum — en thad er einmitt
                          thad sem augad gerir vid tvaer tolur i somu rod.
                          MAELT a ollum 80 samsetningum: besti `+gain` er
                          GK 1,12 · DEF 2,27 · MID 1,24 · FWD 1,59 medan `mean`
                          er GK 3,88 · DEF 3,70 · MID 3,81 · FWD 4,61 — thau
                          rada STODUNUM I GAGNSTAEDA ROD. Skyring sem VARAR VID
                          samanburdinum svarar honum ekki; talan gerir thad.
                          `w.mean` er LESIN ur `makeWindow`, ekki endurreiknud
                          her (tvo eintok af somu tolu reka i sundur).      */}
                      <span style={S.chipMean}>{w.mean.toFixed(2)}{"/GW"}</span>
                      {w.weak.length ? <i style={S.chipBench}>{"bench "}{w.weak.join(",")}</i> : null}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* ---------- SKYRINGIN. HUN VERDUR AD SEGJA HVAD TALAN ER ---------- */}
      <div style={S.legend}>
        <div style={S.legRow}>
          {TIER_NAME.map((n, i) => (
            <span key={n} style={{ ...S.legChip, background: TIER_BG[i], color: TIER_FG[i] }}>{n}</span>
          ))}
          <span style={S.legNote}>
            {"fixture difficulty for"} <b>{"his own position"}</b>
            {" — a defender and a forward at the same club do not get the same number, which is why this cannot be read off the Teams table. On the"}
            {" "}<b>{"his own"}</b>{" scale (the default) the colours are shifted so"}
            {" "}<b>{"his"}</b>{" average week is the neutral grey, which is the same question the frame answers: you have decided on him, so when do you buy him? On"}
            {" "}<b>{"league"}</b>{" they are the absolute scale of the Teams table — a weak club stays red even in its easiest match."}
            {" The tier widths are the measured league sextiles in both, only the centre moves."}
          </span>
        </div>
        <div>
          <b>{"The green frame is a buy window:"}</b>{" "}
          {"the stretch where his fixtures are best"} <b>{"compared with his own average"}</b>
          {" over GW"}{from}{"–"}{to}{". Up to "}{MAX_WINDOWS}{" per player, at least "}{MIN_WINDOW}
          {" gameweeks long. A window can never start or end on a gameweek that is below his average, so a hard game"}
          {" "}<b>{"inside"}</b>{" one is a game to bench — marked with a dot under the cell, and listed as"}
          {" "}<i>{"bench"}</i>{" in the label."}
        </div>
        <div>
          <b>{"+0.00"}</b>{" is the extra expected points over the whole window versus an average stretch of the same"}
          {" length"} <b>{"for him"}</b>{" — it compares a player with himself and with nothing else, so it"}
          {" "}<b>{"cannot rank two players"}</b>{". A defender's measured points move "}{ptsSpan(2)}
          {" across the difficulty range where a midfielder's move "}{ptsSpan(3)}{", and the reason is his floor,"}
          {" not his ceiling: in the easiest fixture the measured points are "}{ptsEasiest(2)}{" for a defender and"}
          {" "}{ptsEasiest(3)}{" for a midfielder. So the same quality of run prints a bigger"}
          {" "}<b>{"+"}</b>{" on a defender. The dim"} <b>{"0.00/GW"}</b> {"beside it is the absolute number —"}
          {" measured expected points per gameweek for an average player in that position — and that one"}
          {" "}<b>{"is"}</b>{" comparable between players. A window does"} <b>{"not"}</b> {"have to be green on the"}
          {" league scale: if you have already decided on the player, the question is which of"}
          {" "}<i>{"his"}</i> {"gameweeks are his best."}
        </div>
        <div style={S.legFine}>
          {"The unit is measured expected points for an"} <b>{"average"}</b> {"player in that position at that"}
          {" difficulty (MEASURED_POS: 3,808 team-matches, 7 seasons) — not for him personally, so a window says"}
          {" when the fixtures are good, not how good he is. A double gameweek adds both fixtures up ("}
          <b>2</b>{"), a blank counts as 0 ("}<b>–</b>{"). "}
          <b>{"Injuries and bans are not in this"}</b>{" — FPL status decides availability and is flagged with"}
          {" "}<b style={{ color:C.red }}>!</b>{" on the name."}
        </div>
      </div>
    </div>
  );
}

const S = {
  wrap:{ marginTop: 8 },
  bar:{ display:"flex", flexWrap:"wrap", gap:8, alignItems:"center", marginBottom:6 },
  barGrp:{ display:"flex", gap:3, alignItems:"center" },
  barLbl:{ fontSize:9.5, color:C.text3 },
  step:{ border:`1px solid ${C.border}`, background:C.card, color:C.text2, cursor:"pointer",
         borderRadius:5, width:22, height:22, fontSize:13, lineHeight:1, padding:0 },
  now:{ fontSize:11.5, color:C.text, fontFamily:mono, display:"inline-flex", alignItems:"center", gap:4 },
  nowN:{ background:"#ece7f0", color:C.purple, borderRadius:8, fontSize:9, padding:"1px 5px" },
  pick:{ border:`1px solid ${C.border}`, background:C.card, color:C.text2, cursor:"pointer",
         borderRadius:5, fontSize:10, padding:"3px 7px" },
  ord:{ border:`1px solid ${C.border}`, background:C.card, color:C.text2, cursor:"pointer",
        borderRadius:5, fontSize:10.5, padding:"3px 8px" },
  ordOn:{ background:C.purple, color:"#fff", border:`1px solid ${C.purple}` },
  boxes:{ display:"flex", flexWrap:"wrap", gap:2, marginBottom:6 },
  box:{ border:`1px solid ${C.border}`, background:C.card, color:C.text3, cursor:"pointer",
        borderRadius:3, fontSize:9, width:20, height:18, padding:0 },
  boxOn:{ background:C.purple, color:"#fff", border:`1px solid ${C.purple}` },

  count:{ fontSize:10.5, color:C.text2, marginBottom:6, lineHeight:1.6 },
  more:{ border:`1px solid ${C.border}`, background:C.card, color:C.purple, cursor:"pointer",
         borderRadius:5, fontSize:10, padding:"2px 7px", marginLeft:6 },
  empty:{ fontSize:12, color:C.text2, padding:"14px 4px" },

  /* EIGID SKRUN-SVAEDI — sidan ma ekki skruna larett (CLAUDE.md 8). */
  scroll:{ overflowX:"auto", border:`1px solid ${C.border}`, borderRadius:8, background:C.card },
  head:{ display:"flex", alignItems:"stretch", borderBottom:`1px solid ${C.border}`,
         background:C.cardAlt, position:"sticky", top:0, zIndex:2 },
  /* FROSNA HAUS-HOLFID BER BAKGRUNN HAUSSINS BERUM ORDUM. `S.nameCell` setur
     `C.card` (radalitinn) og hausrodin er `C.cardAlt`, svo an thessa vaeri
     hvitur flekkur i graum haus — og `inherit` er ekki svarid: i sticky
     hausum erfist `rgba(0,0,0,0)` og heitin skruna synilega undir
     nafnadalkinn (CLAUDE.md 8, maelt tvisvar i tveimur toflum).          */
  headName:{ fontSize:10, fontWeight:700, color:C.text3, background:C.cardAlt },
  headCell:{ fontSize:8.5, color:C.text3, textAlign:"center", fontFamily:mono,
             padding:"3px 0", boxSizing:"border-box" },
  headWin:{ fontSize:10, fontWeight:700, color:C.text3, padding:"3px 8px",
            whiteSpace:"nowrap", boxSizing:"border-box" },
  headWinSub:{ fontWeight:400, color:"#a5a5ae" },
  row:{ display:"flex", alignItems:"stretch", borderBottom:"1px solid #f4f4f6", minHeight:24 },
  /* FROSNI DALKURINN FAER BAKGRUNN BEINT, ALDREI `inherit` — i hausnum situr
     liturinn a sticky-umgjordinni og holfid erfdi rgba(0,0,0,0), svo
     haus-heiti skrunudu synilega undir nafnadalkinn (CLAUDE.md 8).      */
  nameCell:{ display:"flex", alignItems:"center", gap:4, padding:"0 6px",
             position:"sticky", left:0, zIndex:1, background:C.card,
             boxSizing:"border-box", overflow:"hidden", whiteSpace:"nowrap" },
  mine:{ boxShadow:`inset 3px 0 0 ${C.green}` },
  star:{ border:"none", background:"transparent", cursor:"pointer", fontSize:11,
         color:C.text3, padding:0, lineHeight:1 },
  starOn:{ color:"#e8a71c" },
  nameBtn:{ border:"none", background:"transparent", cursor:"pointer", fontSize:11,
            color:C.text, padding:0, fontWeight:600, overflow:"hidden",
            textOverflow:"ellipsis", whiteSpace:"nowrap" },
  pos:{ fontSize:8.5, fontWeight:700 },
  price:{ fontSize:9, color:C.text3, fontFamily:mono, marginLeft:"auto" },
  flag:{ color:C.red, fontWeight:700, fontSize:11 },

  /* 2px GAGNSAER RAMMI A HVERJU HOLFI — annars slitnar glugga-ramminn
     milli holfa (sama regla og `borderSpacing: 0` i FFDR-toflunni).

     >>> ALLAR FJORAR HLIDAR OG OLL FJOGUR HORN I LANGRITUN. <<<
     Fyrsta utgafa skrifadi `border: "2px solid transparent"` (stytting) og
     glugga-ramminn setti `borderTopColor` o.s.frv. (langritun) ofan a.
     Thad er NAKVAEMLEGA gildran ur CLAUDE.md 8, og hun kom fram um leid og
     bilid var VALID: runur koma og fara vid hverja breytingu og React
     fjarlaegir longhand-gildin i odefineradri rod. Eigid prof (kafli B)
     felldi thetta med tveimur vidvorunum — „Removing borderTopColor
     border". Grunnstillinn ma thvi ekki bera EINA styttingu.            */
  cell:{ borderWidth:2, borderStyle:"solid",
         borderTopColor:"transparent", borderRightColor:"transparent",
         borderBottomColor:"transparent", borderLeftColor:"transparent",
         borderTopLeftRadius:0, borderTopRightRadius:0,
         borderBottomLeftRadius:0, borderBottomRightRadius:0,
         boxSizing:"border-box", position:"relative",
         fontSize:8, fontFamily:mono, display:"flex", alignItems:"center",
         justifyContent:"center", fontWeight:700 },
  weakDot:{ position:"absolute", left:"50%", bottom:1, width:3, height:3, marginLeft:-1.5,
            borderRadius:3, background:"#5f3d00" },
  winCell:{ display:"flex", alignItems:"center", gap:4, padding:"1px 8px", whiteSpace:"nowrap" },
  noWin:{ fontSize:9.5, color:C.text3 },
  /* SAMA REGLA OG A HOLFUNUM: `border` (stytting) + `borderColor`
     (langritun) er blondun sem React kvartar um vid endurteikningu — og
     chip-in koma og fara vid hverja bil- og rodunar-breytingu, sem er
     nakvaemlega tha sem hun bitur. CLAUDE.md 8 nefnir thetta par ordrett. */
  chip:{ display:"inline-flex", alignItems:"center", gap:3, fontSize:9,
         borderWidth:1, borderStyle:"solid", borderColor:C.border,
         borderRadius:4, padding:"1px 4px",
         color:C.text2, fontFamily:mono, background:C.cardAlt },
  chipBest:{ borderColor:C.green, background:"#e6f9f0", color:"#046b41" },
  chipGain:{ fontWeight:700 },
  /* DIMMA, EKKI FEITLETRAD: `+gain` er svarid vid „hvenaer" og ma halda
     ahyggjunni; `mean` er svarid vid „hver" og er thar sem augad tharf ad
     LEITA hennar. Liturinn er skrifadur BERUM ORDUM thvi `chipBest` setur
     sinn eigin (`#046b41`) a chip-id og barnid myndi erfa hann.          */
  chipMean:{ color:C.text3, fontSize:8.5 },
  chipBench:{ color:C.amber, fontStyle:"normal", fontSize:8.5 },

  legend:{ fontSize:10, color:C.text3, marginTop:8, lineHeight:1.65,
           display:"flex", flexDirection:"column", gap:4 },
  legRow:{ display:"flex", flexWrap:"wrap", gap:4, alignItems:"center" },
  legChip:{ borderRadius:4, padding:"1px 6px", fontSize:9, fontWeight:700 },
  legNote:{ color:C.text3 },
  legFine:{ color:"#9a9aa4" },
};
