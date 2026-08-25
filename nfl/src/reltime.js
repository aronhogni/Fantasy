/* ============================================================
   reltime.js — AFSTAEDUR TIMI. HREIN, OG THVI PROFANLEG.

   Þetta var EIN utfaersla inni i `Sources.jsx` og EIN HARDKODUD
   SETNING i `Dashboard.jsx` sem sagdi alltaf "just now". Sidari
   fullyrdingin var TIMASETT LYGI: hun batnadi aldrei og versnadi med
   hverri minutu — spjald sem var lesid fyrir klukkutima sagdi samt
   "just now", sem er nakvaemlega su gerd af tolu sem er verri en engin.

   `fetchedAt` VAR ThEGAR TIL i `Dashboard`; thad var adeins ekki lesid.

   Hun er sett i eigin einingu en ekki flutt ut ur `Sources.jsx` af thvi
   ad birtingar-hjalp sem byr inni i einum flipa dregur hina flipana i
   ad flytja inn ur honum. Hrein rokfraedi a heima i `.js`, ekki i
   `.jsx` — sama regla og annars stadar i thessu repo.                */

/**
 * "just now" | "12m ago" | "5h ago" | "2026-08-25"
 *
 * `null`/rusl/framtid -> `"—"`. Framtid er MEDVITAD tilfelli: klukka
 * notandans getur verid a eftir thjonsins, og "-3m ago" er verra en
 * ad thegja.
 */
export function when(ts, nowMs = Date.now()) {
  if (!ts) return "\u2014";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "\u2014";
  const mins = Math.round((nowMs - d.getTime()) / 60000);
  if (mins < 0) return "\u2014";
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 48) return `${h}h ago`;
  return d.toISOString().slice(0, 10);
}
