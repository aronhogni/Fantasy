/* ============================================================
   „ER SKRAIN KEYRD BEINT?" — EIN UTFAERSLA (10.9.2026)

   Fjorar skriftur baru sina eigin: tvaer med `realpathSync` a badum
   megin (fetch.mjs, validate-data.mjs) og tvaer med berum
   strengja-samanburdi `import.meta.url === "file://" + argv[1]`
   (snapshot-predictions.mjs, fetch-bsd-teams.mjs). Su sidari brestur a
   symlink, afstaedri slod og `%20` i slod — og brestur THOGULT: skriftan
   lykur a sekundubroti med utgangsstodu 0 og gerir ekkert. Thad er
   nakvaemlega bilunin sem tests/fetch-entry.mjs ver fetch.mjs gegn
   (CLAUDE.md kafli 7), og hun var adeins varin thar.

   `realpathSync` a BADUM megin: `import.meta.url` er alltaf alger URL,
   `process.argv[1]` er thad sem skelin gaf — afstaett eda symlinkad.  */
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function isInvokedDirectly(importMetaUrl, argv1 = process.argv[1]) {
  if (!argv1) return false;
  try { return realpathSync(fileURLToPath(importMetaUrl)) === realpathSync(argv1); }
  catch { return false; }
}
