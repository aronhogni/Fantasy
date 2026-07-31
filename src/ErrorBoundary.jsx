/* ============================================================
   VILLUVORN — HVITI SKJARINN ER VERSTA UTKOMAN

   AF HVERJU: appid les 25 skrar sem pipeline skrifar ur SEX heimildum, og
   thetta repo hefur ThEGAR verid bitid af logun-breytingum (sja kafla 5b og
   tests/data-resilience.mjs). Eitt ovaent svid i render -> React aftengir
   ALLT tred og notandinn faer hvitan skja. Ekkert i appinu greip thad.

   ALVARLEGRA TILFELLID ER VISTADA ASTANDID. `loadState` les
   `fpl_planner_v3` ur localStorage og setur thad beint i state (App.jsx
   ~701). Se blobbid oheilt — skiptaaaetlun fra eldri utgafu, chip-lykill
   sem er ekki lengur til — HRYNUR APPID VID HVERJA HLEDSLU og notandinn
   hefur ENGA leid til baka nema opna devtools. Thess vegna er
   utgongu-hnappurinn hér: hann hreinsar vistad astand og endurhledur.

   TVENNT SEM ThESSI VORN GERIR EKKI, VILJANDI:
     - Hun grípur EKKI async-villur (fetch). Their eru thegar meðhondladar
       i `dataState`, sem synir sina eigin villu-kassa.
     - Hun hreinsar ALDREI `fpl_lang`. Sa sem hrundi a ensku verdur ad fa
       ensku aftur — annars kastast hann i islensku ofan a hrunið og skilur
       ekki lengur hnappana. Vordur i tests/error-boundary.mjs.
   ============================================================ */
import React from "react";
import { t as tx } from "./i18n.js";

/* Hreinsar ASTAND appsins en EKKI tungumalid. Lyklarnir eru allir med
   `fpl_`-forskeyti; thad er valid yfir hardkodadan lista svo nyr lykill
   (fpl_planner_v4) verdi ekki utundan thegjandi.                        */
export function clearSavedState() {
  const KEEP = new Set(["fpl_lang"]);
  const dropped = [];
  try {
    const ls = globalThis.localStorage;
    if (!ls) return dropped;
    for (let i = ls.length - 1; i >= 0; i--) {
      const k = ls.key(i);
      if (k && k.startsWith("fpl_") && !KEEP.has(k)) { ls.removeItem(k); dropped.push(k); }
    }
  } catch { /* private mode: ekkert ad hreinsa */ }
  return dropped;
}

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null, info: null, confirm: false };
  }

  static getDerivedStateFromError(err) { return { err }; }

  componentDidCatch(err, info) {
    this.setState({ info });
    /* Skilabodin i console eru fyrir THIG, ekki notandann — full stack. */
    console.error("[FPL] render hrundi:", err, info?.componentStack);
  }

  render() {
    const { err, info, confirm } = this.state;
    if (!err) return this.props.children;

    /* Skilabodin sjalf eru EKKI thydd: their koma ur JS-vixlinum og eru
       gagnleg sem tholanleg villuskilabod, ekki sem vidmotstexti.       */
    const msg = String(err?.message || err);
    return (
      <div style={S.wrap} role="alert">
        <div style={S.card}>
          <h1 style={S.h1}>{tx("Eitthvað brotnaði")}</h1>
          <p style={S.body}>
            {tx("Appið gat ekki teiknað þessa sýn. Öll gögn eru óskemmd á GitHub — þetta er villa í viðmótinu, ekki í gögnunum þínum.")}
          </p>
          <pre style={S.pre}>{msg}</pre>
          <div style={S.row}>
            <button style={S.primary} onClick={() => globalThis.location?.reload()}>
              {tx("Endurhlaða")}
            </button>
            {confirm ? (
              <button style={S.danger}
                onClick={() => { clearSavedState(); globalThis.location?.reload(); }}>
                {tx("já — hreinsa og endurhlaða")}
              </button>
            ) : (
              <button style={S.ghost} onClick={() => this.setState({ confirm: true })}>
                {tx("Hreinsa vistaða plönun")}
              </button>
            )}
          </div>
          <p style={S.hint}>
            {confirm
              ? tx("Þetta eyðir skiptaáætlun, fyrirliða, chips, andstæðingum og vaktlista — tungumálið heldur sér. Liðið sjálft kemur úr FPL og hverfur ekki.")
              : tx("Ef appið hrynur við HVERJA hleðslu er vistaða plönunin líklega orsökin.")}
          </p>
          {info?.componentStack ? (
            <details style={S.det}>
              <summary style={S.sum}>{tx("Tæknilegar upplýsingar")}</summary>
              <pre style={S.stack}>{info.componentStack}</pre>
            </details>
          ) : null}
        </div>
      </div>
    );
  }
}

const S = {
  wrap: { minHeight: "100vh", background: "#f2f2f4", display: "flex",
          alignItems: "flex-start", justifyContent: "center", padding: "40px 16px",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
  card: { background: "#fff", border: "1px solid #e0e0e4", borderRadius: 12,
          padding: 20, maxWidth: 620, width: "100%" },
  h1: { margin: "0 0 8px", fontSize: 19, color: "#37003c" },
  body: { margin: "0 0 12px", fontSize: 13.5, color: "#61616b", lineHeight: 1.5 },
  pre: { margin: "0 0 14px", padding: 10, background: "#fdecee", color: "#8a1f28",
         border: "1px solid #f7ccd2", borderRadius: 8, fontSize: 12,
         whiteSpace: "pre-wrap", wordBreak: "break-word",
         fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" },
  row: { display: "flex", gap: 8, flexWrap: "wrap" },
  primary: { background: "#37003c", color: "#fff", border: "none", borderRadius: 8,
             padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  ghost: { background: "#fff", color: "#61616b", border: "1px solid #c9c9d0",
           borderRadius: 8, padding: "9px 14px", fontSize: 13, cursor: "pointer" },
  danger: { background: "#d92d3c", color: "#fff", border: "none", borderRadius: 8,
            padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  hint: { margin: "12px 0 0", fontSize: 12, color: "#8b8b95", lineHeight: 1.5 },
  det: { marginTop: 12 },
  sum: { fontSize: 12, color: "#8b8b95", cursor: "pointer" },
  stack: { fontSize: 11, color: "#61616b", whiteSpace: "pre-wrap",
           maxHeight: 220, overflow: "auto", marginTop: 8 },
};
