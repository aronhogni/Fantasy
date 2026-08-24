/* ============================================================
   Fine.jsx — ROKSTUDNINGUR SEM ER FELLDUR NIDUR, EKKI EYDDUR
   ============================================================
   HLUTURINN VAR I `DraftBoard.jsx` OG ER FLUTTUR HINGAD 24.8.2026 thvi
   forsidan (`Dashboard.jsx`) tharf hann lika. Rokin fyrir honum eru
   ordrett thau somu og thau voru a bordinu, svo thau flytja med:

   BEIDNI NOTANDANS 20.8.2026 (bordid) og AFTUR 24.8.2026 (forsidan):
   "Mer finnst alltof mikid ad gera a forsidunni, taktu ut eithvad af
   thessum texta, eg vill adalega nota draft siduna til ad segja mer
   hvenr eg a ad velja."

   HANN HEFUR RETT. Hann fær ~90 sekundur a val; texti sem hann les ekki
   er ekki hlutlaus, hann kaffaerir thad sem hann A ad lesa.

   OG SAMT MA TEXTINN EKKI FARA. Reglan i thessu repo-i er ad tala verdi
   ad geta sagt hvadan hun kemur, og NOKKRAR af thessum setningum eru
   til THVI ThAD SEM ThAER LYSA ER OMAELT. Ad EYDA theirri setningu vaeri
   ekki ad stytta heldur ad breyta merkingu: omaelt merki sem stendur an
   fyrirvara les eins og MAELT merki. Þad er bilunin sem allt thetta
   verkefni er byggt gegn.

   ÞVI ER ThETTA HVORKI STYTTING NE EYDING HELDUR FELLING: sjalfgefna
   syn er EIN LINA, og rokstudningurinn er einum smell undan.
   `<details>` er valid og ekki `title=`, af thremur astaedum:
     · `title` sest ekki a snertiskja, og hann draftar i sima
     · `title` er ekki laesanlegt af skjalesara i somu rod
     · `<details>` er ThAD SEM ER ThEGAR NOTAD fyrir "Why him"

   VORDUR: `render.mjs` kafli 8 (bordid) og `dashboard.mjs` kafli 3h
   (forsidan) — hver felld setning verdur ad vera (a) ENN I DOM-inu og
   (b) inni i `<details>` sem er EKKI `open`. Bædi thurfa ad haldast:
   (a) eitt hleypir eydingu i gegn, (b) eitt hleypir theim i gegn utan
   disclosure og tha er ekkert stytt.
   ============================================================ */

import React from "react";

export default function Fine({ summary, children }) {
  return (
    <details className="fine">
      <summary>{summary}</summary>
      <div className="fine-body">{children}</div>
    </details>
  );
}
