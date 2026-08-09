import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/* ============================================================
   NFL-appid er SJALFSTAETT VERKEFNI i eigin mopu.

   HVERS VEGNA THAD VAR FLUTT UT UR ROTINNI: thad deildi
   `package.json`, `vite.config.js` og `tests/run-tests.mjs` med
   FPL-appinu, og tvaer lotur sem unnu samtimis rakust stodugt a —
   `npm test` keyrdi bædi soffnin, `git rebase` strandadi a
   ovistudum breytingum hinnar, og eitt profa fell einu sinni EKKI
   af thvi thad vaeri bilad heldur af thvi hin lotan var ad skrifa
   skra medan thad keyrdi.

   Nu deila thau ENGRI SKRA. Adeins git-hirslan sjalf er sameiginleg.

   base = "/Fantasy/nfl/" — GitHub Pages thjonar fra undirslod og
   NFL-appid situr i undirmoppu hennar. `outDir` bendir upp i
   sameiginlega `dist/` svo ein Pages-utgafa beri bædi oppin.
   ============================================================ */
export default defineConfig({
  base: "/Fantasy/nfl/",
  plugins: [react()],
  build: {
    outDir: "../dist/nfl",
    emptyOutDir: true,
    sourcemap: false,
  },
});
