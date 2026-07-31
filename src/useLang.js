/* React-hlidin a i18n. SER SKRA svo `i18n.js` haldist HREINT —
   `model.js` og `stats.js` kalla t() og their eru fluttir inn i
   Node-profin an React. Ef React vaeri i i18n.js myndi hver
   profakeyrsla draga React inn ad osekju.

   HOOKURINN GEFUR `lang` SEM DEP-GILDI. Thad er ekki skraut:
   useMemo-vistud gildi sem BERA texta yrdu STOD eftir tungumalsskipti
   (dep-listinn breytist ekki thott LANG breytist). Thess vegna er
   `lang` i dep-listum theirra memo-a sem framleida texta — sja
   tests/i18n.mjs kafla 4, sem er vordur gegn thvi ad nyr memo gleymi
   honum.                                                              */
import { useState, useEffect } from "react";
import { getLang, subscribe } from "./i18n.js";

export function useLang() {
  const [lang, setState] = useState(getLang);
  useEffect(() => subscribe(setState), []);
  /* Tungumal getur hafa breyst milli render og effect (annar hluti
     tresins skipti) — synum alltaf gildandi tungumal.                */
  return lang === getLang() ? lang : getLang();
}
