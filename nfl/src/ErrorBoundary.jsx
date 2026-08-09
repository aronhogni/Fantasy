/* ============================================================
   ErrorBoundary.jsx

   MIKILVAEGARA EN KASSINN ER UTGANGAN. Laerdomurinn ur FPL-appinu:
   `loadState` les `localStorage` beint i state, svo oheilt blob
   felldi appid vid HVERJA hledslu og notandinn komst aldrei ad
   hnappi til ad laga thad. Thess vegna er hreinsihnappurinn hér, hann
   er TVISTIGA, og hann hreinsar ALLA `nfl_*`-lykla — **valid, ekki
   hardkodadur listi**, svo nyr lykill verdi ekki utundan thegjandi.

   GRIPUR EKKI async-villur. Thaer eiga sinn eigin villukassa i
   gagnahledslunni (`App.jsx`), og thad er viljandi: net sem dettur
   ut a ekki ad lita eins ut og bilad app.
   ============================================================ */

import React from "react";
import { clearState } from "./data.js";

export default class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null, armed: false }; }

  static getDerivedStateFromError(err) { return { err }; }

  componentDidCatch(err, info) {
    console.error("NFL app fell:", err, info);
  }

  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="shell">
        <div className="panel" style={{ marginTop: 40 }}>
          <h2>Something broke</h2>
          <div className="sub">
            The page stopped rendering. The message below is the actual error.
          </div>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "var(--dim)",
            background: "var(--panel2)", padding: 10, borderRadius: 6 }}>
            {String(this.state.err && (this.state.err.stack || this.state.err.message
              || this.state.err))}
          </pre>
          <div className="note warn">
            If this happens on every load, saved state in this browser is the usual
            cause — it is read straight into the app before anything renders.
            Clearing it below is safe: it only removes your league settings, watchlist
            and draft board, all of which live in this browser only.
          </div>
          <div className="row">
            <button className="act" onClick={() => location.reload()}>Reload</button>
            {!this.state.armed ? (
              <button className="act" onClick={() => this.setState({ armed: true })}>
                Clear saved state…
              </button>
            ) : (
              <button className="act primary" onClick={() => { clearState(); location.reload(); }}>
                Yes — clear everything and reload
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
