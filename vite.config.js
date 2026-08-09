import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

/* base = "/Fantasy/" því GitHub Pages þjónar frá undirslóð
   (aronhogni.github.io/Fantasy). Án þess finnur síðan ekki assets/.
   Ef eigið heiti er sett upp síðar, breytist þetta í "/".            */

/* TVAER SIDUR, EITT BYGGINGARSKREF.
   `index.html` er FPL-appid og `nfl.html` er NFL-appid. Their deila
   ENGUM kóða og engum stilum — thad er viljandi, svo breyting i odru
   geti ekki fellt hitt. Vite byggir badar i somu `dist/`, svo
   GitHub-Pages-workflow-id tharf enga breytingu:

     /Fantasy/            -> FPL
     /Fantasy/nfl.html    -> NFL

   HVERS VEGNA MULTI-PAGE EN EKKI LEID INNAN SAMA APPS: NFL-hlutinn
   saekir sin eigin ~4 MB af gognum. Vaeri hann i sama bundli myndi
   FPL-notandinn borga fyrir kóða sem hann opnar aldrei.               */
export default defineConfig({
  base: "/Fantasy/",
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        nfl: resolve(import.meta.dirname, "nfl.html"),
      },
    },
  },
});
